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
  const [allInventoryList, setAllInventoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<{ [key: string]: string[] }>({});
  // 从本地存储获取当前用户的信息
  const data_prefix = getPrefixByCompany(Taro.getStorageSync('company'));
  const role = Taro.getStorageSync('role');
  const belongToCompany = Taro.getStorageSync('belongToCompany');

  // 获取商品类型和价格列表
  const fetchOptions = async () => {
    try {
      // 使用 db.command.aggregate 来聚合查询，并且获取所有数据
      const res = await db.collection(data_prefix + 'stock')
        .aggregate()
        .match({
          type: { $ne: '' } // 排除类型为空的记录
        })
        .project({
          pricePrefix: db.command.aggregate.substr(['$name', 0, 3]), // 获取名称的前三个字符作为价格前缀
          type: true,  // 保留类型字段
          name: true,  // 保留商品名称字段
          quantity: true, // 保留库存数量字段
          _id: true,
          extra: true,
        })
        .group({
          _id: '$pricePrefix', // 按价格前缀分组
          types: db.command.aggregate.addToSet('$type'), // 收集该前缀对应的所有类型
          names: db.command.aggregate.addToSet('$name'), // 收集该前缀对应的所有商品名称
          stockItems: db.command.aggregate.addToSet({
            name: '$name',
            type: '$type',
            quantity: '$quantity',
            _id: '$_id',
            extra: '$extra',
          }) // 将该前缀下的所有商品项收集到 stockItems 数组
        })
        .sort({
          _id: 1 // 按价格前缀排序
        })
        .end();
  
      console.log('查询结果：', res);
  
      // 处理返回的数据
      const allPrices = res.list.map(item => item._id); // 获取所有价格前缀
      const allOptions = res.list.reduce((acc, item) => {
        acc[item._id] = item.types.sort(); // 将类型进行排序
        return acc;
      }, {});
  
      // 对每个价格前缀下的商品项进行排序，并去掉类型为空的项
      const allData = res.list.flatMap(item => {
        // 过滤掉 type 为空的商品项
        const sortedItems = item.stockItems
          .filter(stockItem => stockItem.type) // 去掉类型为空的商品项
          .sort((a, b) => a.name.localeCompare(b.name)); // 按商品名称排序
        return sortedItems;
      });
  
      // 更新状态
      setOptions(allOptions);
      console.log("allData:", allData);
      setAllInventoryList(allData); // 设置所有商品项数据
      setSelectedValue(allPrices[0] || ''); // 默认选中第一个价格前缀
      setSelectedType(allOptions[allPrices[0]]?.[0] || ''); // 默认选中第一个类型
    } catch (error) {
      console.error('Fetch options error:', error);
    }
  };
  
  //过滤数据代替数据库请求数据
  const filterDataByValueAndType = async (value: string, type: string) => {
    console.log("name_:",value,"type:",type);
    setLoading(true);
    let checkedData = [];
    for(let i=0; i<allInventoryList.length; i++){
      if(allInventoryList[i]?.name.substring(0, 3).includes(value) && allInventoryList[i]?.type == type){
        checkedData.push(allInventoryList[i]);
      }
    }
    //console.log("查询出来的数据checkedData",checkedData);
    setInventoryList(checkedData);
    setLoading(false);
  }


  // 当前库存列表查询
  /** 
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

      //console.log("所有数据:", allData);
      setInventoryList(allData);
      setLoading(false);
    } catch (error) {
      console.error('Fetch inventory error:', error);
      setLoading(false);
    }
  };*/

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

  // 刷新页面
  useEffect(() => {
    fetchOptions(); // 获取商品类型和价格列表
  }, []);

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
    if (selectedValue !== '' && selectedType !== '') {
      //fetchData(selectedValue, selectedType); // 数据更新
      filterDataByValueAndType(selectedValue, selectedType)
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
          {Object.keys(options)
            .sort((a, b) => a.localeCompare(b)) // 按照价格顺序排序
            .map((price, index) => (
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
          {inventoryList.map((item, index) => (
            <View className='item'  
              key={item._id} 
              style={{
                //backgroundColor: index % 2 === 0 ? '#f9f9f9' : '#ffffff', // 奇偶数背景色
                backgroundColor: Number(item.quantity) < 0 ? '#ffcccc' : (index % 2 === 0 ? '#f5f5f5' : '#ffffff'), // 负库存为红色
              }}
            >
              <Text className='name'
                style={{width: (belongToCompany && role === '会计')? '50%': '84%'}}
              >{item.name}</Text>
              <Text className='quantity'>{item.quantity}</Text>

              {belongToCompany && role === '会计' && (<View className='actions'>                    
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