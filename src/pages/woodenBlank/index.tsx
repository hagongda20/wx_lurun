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
      let allPrices: string[] = [];
      let allOptions: { [key: string]: string[] } = {};

      const countRes = await db.collection(data_prefix + 'woodenBlank').count();
      const total = countRes.total;

      const batchSize = 20;
      const batchTimes = Math.ceil(total / batchSize);

      let allData = [];
      for (let i = 0; i < batchTimes; i++) {
        const res = await db.collection(data_prefix + 'woodenBlank')
          .field({ type: true, name: true, quantity: true })
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

        allData = allData.concat(res.data);//全数据state
      }
      //console.log("查询出的所有数据:", allData);
      setAllInventoryList(allData);//初始将所有数据存入状态
      const uniquePrices = Array.from(new Set(allPrices)); // 去重
      //console.log("查询出的所有价格:", uniquePrices);
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

  //过滤数据代替数据库请求数据
  const filterDataByValueAndType = async (value: string, type: string) => {
    setLoading(true);
    let checkedData = [];
    for(let i=0; i<allInventoryList.length; i++){
      if(allInventoryList[i]?.name.substring(0, 3) == value && allInventoryList[i]?.type == type){
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
      url: `/pages/woodenBlank/woodenBlankAdd/index?id=${id}&operate=${'plus'}&selectedValue=${selectedValue}&selectedType=${selectedType}`
    });
  };

  // 入库操作
  const handleStockIn = (id: number) => {
    console.log(`商品 ${id} 入库操作`);
    Taro.navigateTo({
      url: `/pages/woodenBlank/woodenBlankAdd/index?id=${id}&operate=${'add'}&selectedValue=${selectedValue}&selectedType=${selectedType}`
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