import Taro from '@tarojs/taro';
import { View, Text, Button, RadioGroup, Radio, ScrollView } from '@tarojs/components';
import './index.scss';
// eslint-disable-next-line import/first
import { useState, useEffect } from 'react';
import { db, getPrefixByCompany } from '../../utils';

const InventoryList: Taro.FC = () => {
  const [selectedValue, setSelectedValue] = useState(''); // 初始选中值为空
  const [inventoryList, setInventoryList] = useState([]);
  const [allInventoryList, setAllInventoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<{ [key: string]: string[] }>({});
  // 从本地存储获取当前用户的信息
  const data_prefix = getPrefixByCompany(Taro.getStorageSync('company'));
  const role = Taro.getStorageSync('role');
  const belongToCompany = Taro.getStorageSync('belongToCompany');

  // 获取商品类型和价格列表
  const fetchOptions = async (value: string) => {
    try {
      const res = await db.collection(data_prefix + 'woodenBlank')
        .aggregate()
        .project({
          pricePrefix: db.command.aggregate.substr(['$name', 0, 3]), // 获取前三个字符作为价格前缀
          type: true,
          name: true,
          quantity: true,
          _id: true,
          extra: true,
        })
        .group({
          _id: '$pricePrefix',
          types: db.command.aggregate.addToSet('$type'),
          stockItems: db.command.aggregate.addToSet({
            name: '$name',
            type: '$type',
            quantity: '$quantity',
            _id: '$_id',
            extra: '$extra',
          }),
        })
        .sort({ _id: 1 }) // 按价格前缀排序
        .end();

      // 处理返回数据
      const allPrices = res.list.map(item => item._id); // 获取所有价格前缀
      const allOptions = res.list.reduce((acc, item) => {
        acc[item._id] = item.types.sort(); // 将类型排序
        return acc;
      }, {});

      // 对每个价格前缀下的商品项进行排序，并去掉类型为空的项
      const allData = res.list.flatMap(item => {
        // 过滤掉 type 为空的商品项
        const sortedItems = item.stockItems
          .sort((a, b) => a.name.localeCompare(b.name)); // 按商品名称排序
        return sortedItems;
      });
      const validSelectedValue = allPrices.includes(value) ? value : allPrices[0];
      setAllInventoryList(allData); // 设置所有商品项数据
      setOptions(allOptions); // 更新价格前缀的选项
      setSelectedValue(validSelectedValue); // 更新选中的价格前缀
    } catch (error) {
      console.error('Fetch options error:', error);
    }
  };

  // 获取当前库存数据
  /**
  const fetchData = async (value: string) => {
    try {
      setLoading(true);
      let query = db.collection(data_prefix + 'woodenBlank').where({
        name: db.RegExp({
          regexp: `^${value}`,
          options: 'i',
        }),
      });

      const countRes = await query.count();
      const total = countRes.total;
      const batchSize = 20;
      const batchTimes = Math.ceil(total / batchSize);

      let allData: any[] = [];
      for (let i = 0; i < batchTimes; i++) {
        const res = await query.skip(i * batchSize).limit(batchSize).get();
        allData = allData.concat(res.data);
      }

      allData.sort((a, b) => a.name.localeCompare(b.name)); // 按名称排序
      setInventoryList(allData);
      setLoading(false);
    } catch (error) {
      console.error('Fetch inventory error:', error);
      setLoading(false);
    }
  }; */

  //过滤数据代替数据库请求数据
  const filterDataByValue = async (value: string) => {
    console.log("name_:",value);
    setLoading(true);
    let checkedData = [];
    for(let i=0; i<allInventoryList.length; i++){
      if(allInventoryList[i]?.name.substring(0, 3).includes(value)){
        checkedData.push(allInventoryList[i]);
      }
    }
    //console.log("查询出来的数据checkedData",checkedData);
    setInventoryList(checkedData);
    setLoading(false);
  }

  // 出入库返回后inventoryList相关的数据更新
  const filterData = async (id: string, quantity: string) => {
    //console.log('数据过滤id,quantity:',id,quantity);
    setInventoryList(prevInventoryList => 
      prevInventoryList.map(item => item._id === id ? { ...item, quantity: quantity } : item)
    );
    //总数据列表相应数据更新
    setAllInventoryList(prevAllInventoryList => 
      prevAllInventoryList.map(item => item._id === id ? { ...item, quantity: quantity } : item)
    );
  }

  // 刷新页面数据
  useEffect(() => {
    fetchOptions(selectedValue);
  }, []);

  useEffect(() => {
    if (selectedValue) {
      filterDataByValue(selectedValue)
    }
  }, [selectedValue]);

  //刷新页面
  useEffect(() => {
    // 监听事件，并在收到事件时执行 refreshHandler
    Taro.eventCenter.on('refreshPageStockList', (id: string, quantity:string) => filterData(id, quantity));

    // 组件卸载时取消监听，避免内存泄漏
    return () => {
      //Taro.eventCenter.off('refreshPageStockList', (value: string, type:string) => fetchData(value, type));
      Taro.eventCenter.on('refreshPageStockList', (id: string, quantity:string) => filterData(id, quantity));
    };
  }, []);

  useEffect(() => {
    if (selectedValue !== '') {
      filterDataByValue(selectedValue)
    }
  }, [selectedValue]); // 当 selectedValue 或 selectedType 变化时重新获取数据

  // 出库操作
  const handleStockOut = (id: number) => {
    console.log(`商品 ${id} 出库操作`);
    Taro.navigateTo({
      url: `/pages/woodenBlank/woodenBlankAdd/index?id=${id}&operate=${'plus'}&selectedValue=${selectedValue}`
    });
  };

  // 入库操作
  const handleStockIn = (id: number) => {
    console.log(`商品 ${id} 入库操作`);
    Taro.navigateTo({
      url: `/pages/woodenBlank/woodenBlankAdd/index?id=${id}&operate=${'add'}&selectedValue=${selectedValue}`
    });
  };

  // 选择价格时默认选中第一个类型
  const handlePriceChange = (e: any) => {
    const price = e.detail.value;
    setSelectedValue(price);
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
          {Object.keys(options)
            .sort((a, b) => a.localeCompare(b)) // 按照价格顺序排序
            .map((price, index) => (
              <Radio key={index} value={price} checked={selectedValue === price} className='radio'>{price}</Radio>
            ))}
        </RadioGroup>
        
      </View>

      {loading ? (
        <Text>Loading...</Text>
      ) : (
        <View className='list' >
          {inventoryList.map(item => (
            <View className='item'  
              key={item._id} 
              style={{
                backgroundColor: Number(item.quantity) < 0 ? '#ffcccc' : 'white', 
              }}
            >
              <Text className='name'
                style={{width: belongToCompany? '50%': '84%'}}
              >{item.name}</Text>
              <Text className='quantity'>{item.quantity}</Text>

              {belongToCompany && (<View className='actions'>                    
                  <Button
                    className='action-btn stock-out-btn'
                    onClick={() => handleStockOut(item._id)}
                  >
                    出库
                  </Button>
                
                {belongToCompany && role === '会计' && (   //属于本公司的会计才能入库
                  <Button
                    className='action-btn stock-in-btn'
                    onClick={() => handleStockIn(item._id)}
                  >
                    入库
                  </Button>
                )}
              </View>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

export default InventoryList;
