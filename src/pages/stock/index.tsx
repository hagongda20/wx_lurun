import Taro from '@tarojs/taro';
import { View, Text, Button, RadioGroup, Radio, ScrollView } from '@tarojs/components';
import './index.scss';
// eslint-disable-next-line import/first
import { useState, useEffect } from 'react';
import { db, getPrefixByCompany } from '../../utils';

const InventoryList: Taro.FC = () => {
  const [selectedValue, setSelectedValue] = useState(''); // 初始选中值为空
  const [selectedType, setSelectedType] = useState(''); // 初始选中类型为空
  const [inventoryList, setInventoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<{ [key: string]: string[] }>({});
  // 从本地存储获取当前用户的信息
  const data_prefix = getPrefixByCompany(Taro.getStorageSync('company'));
  const role = Taro.getStorageSync('role');

  // 获取商品类型和价格列表
  const fetchOptions = async () => {
    try {
      let allPrices: string[] = [];
      let allOptions: { [key: string]: string[] } = {};

      const countRes = await db.collection(data_prefix + 'stock').count();
      const total = countRes.total;

      const batchSize = 20;
      const batchTimes = Math.ceil(total / batchSize);

      for (let i = 0; i < batchTimes; i++) {
        const res = await db.collection(data_prefix + 'stock')
          .field({ type: true, name: true })
          .skip(i * batchSize)
          .limit(batchSize)
          .get();

        res.data.forEach(item => {
          if (item.name) {
            const price = item.name.substring(0, 3); // 获取名称的前三个字符
            if (!allPrices.includes(price)) {
              allPrices.push(price);
            }
            if (!allOptions[price]) {
              allOptions[price] = [];
            }
            if (item.type && !allOptions[price].includes(item.type)) {
              allOptions[price].push(item.type);
            }
          }
        });
      }

      const uniquePrices = Array.from(new Set(allPrices)); // 去重
      console.log("查询出的所有价格:", uniquePrices);
      setOptions(allOptions);
      setSelectedValue(uniquePrices[0] || '');

      // 默认选中第一个价格和第一个类型
      if (uniquePrices.length > 0) {
        setSelectedValue(uniquePrices[0]);
        if (allOptions[uniquePrices[0]]) {
          setSelectedType(allOptions[uniquePrices[0]][0] || '');
        }
      }
    } catch (error) {
      console.error('Fetch options error:', error);
    }
  };

  // 当前库存列表查询
  const fetchData = async (value: string, type: string) => {
    try {
      setLoading(true);
      let query = db.collection(data_prefix + 'stock');

      // 添加搜索条件
      query = query.where({
        name: db.RegExp({
          regexp: value,
          options: 'i'
        }),
      });

      if (type) {
        query = query.where({
          type: type
        });
      }

      const countRes = await query.count();
      const total = countRes.total;
      console.log("当前库存商品总记录数 count:", total, "company:", data_prefix);

      const batchSize = 20;
      const batchTimes = Math.ceil(total / batchSize);

      let allData = [];
      for (let i = 0; i < batchTimes; i++) {
        let batchQuery = query.skip(i * batchSize).limit(batchSize);
        const res = await batchQuery.get();
        allData = allData.concat(res.data);
      }

      console.log("所有数据:", allData);
      setInventoryList(allData);
      setLoading(false);
    } catch (error) {
      console.error('Fetch inventory error:', error);
      setLoading(false);
    }
  };

  // 刷新页面
  useEffect(() => {
    fetchOptions(); // 获取商品类型和价格列表
  }, []);

  //刷新页面
  useEffect(() => {
    // 监听事件，并在收到事件时执行 refreshHandler
    Taro.eventCenter.on('refreshPageStockList', (value: string, type:string) => fetchData(value, type));

    // 组件卸载时取消监听，避免内存泄漏
    return () => {
      Taro.eventCenter.off('refreshPageStockList', (value: string, type:string) => fetchData(value, type));
    };
  }, []);

  useEffect(() => {
    if (selectedValue !== '' && selectedType !== '') {
      fetchData(selectedValue, selectedType); // 数据更新
    }
  }, [selectedValue, selectedType]); // 当 selectedValue 或 selectedType 变化时重新获取数据

  // 出库操作
  const handleStockOut = (id: number) => {
    console.log(`商品 ${id} 出库操作`);
    Taro.navigateTo({
      url: `/pages/stock/stockAdd/index?id=${id}&operate=${'plus'}&selectedValue=${selectedValue}&selectedType=${selectedType}`
    });
  };

  // 入库操作
  const handleStockIn = (id: number) => {
    console.log(`商品 ${id} 入库操作`);
    Taro.navigateTo({
      url: `/pages/stock/stockAdd/index?id=${id}&operate=${'add'}&selectedValue=${selectedValue}&selectedType=${selectedType}`
    });
  };

  // 选择价格时默认选中第一个类型
  const handlePriceChange = (e: any) => {
    const price = e.detail.value;
    setSelectedValue(price);
    if (options[price]) {
      setSelectedType(options[price][0] || '');
    }
  };

  return (
    <ScrollView
      className='inventory-list'
      scrollY
      scrollWithAnimation
    >
      <View className='navbar'>
        {/* 价格单选框 */}
        <RadioGroup onChange={handlePriceChange} className='radio-group'>
          {Object.keys(options).map((price, index) => (
            <Radio key={index} value={price} checked={selectedValue === price} className='radio'>{price}</Radio>
          ))}
        </RadioGroup>
        {/* 商品类型单选框 */}
        <RadioGroup onChange={(e) => setSelectedType(e.detail.value)} className='radio-group'>
          {options[selectedValue] && options[selectedValue].map((type, index) => (
            <Radio key={index} value={type} checked={selectedType === type} className='radio'>{type}</Radio>
          ))}
        </RadioGroup>
      </View>

      {loading ? (
        <Text>Loading...</Text>
      ) : (
        <View className='list' >
          {inventoryList.map(item => (
            <View className='item'  key={item._id} style={{backgroundColor: Number(item.quantity) < 0 ? '#ffcccc' : 'white' }}>
              <Text className='name'>{item.name}</Text>
              <Text className='quantity'>{item.quantity}</Text>

              <View className='actions'>
                <Button
                  className='action-btn stock-out-btn'
                  onClick={() => handleStockOut(item._id)}
                >
                  出库
                </Button>
                {role === '会计' && (
                  <Button
                    className='action-btn stock-in-btn'
                    onClick={() => handleStockIn(item._id)}
                  >
                    入库
                  </Button>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

export default InventoryList;
