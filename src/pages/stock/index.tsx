import Taro from '@tarojs/taro';
import { View, Text, Button, RadioGroup, Radio } from '@tarojs/components';
import './index.scss';
import { useEffect, useState } from 'react';
import { db, getPrefixByCompany } from '../../utils';

const InventoryList: Taro.FC = () => {
  const [selectedValue, setSelectedValue] = useState('2.4'); // 初始选中值为2.44
  const [inventoryList, setInventoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  // 从本地存储获取当前用户的信息
  const data_prefix = getPrefixByCompany(Taro.getStorageSync('company'));
  const role = Taro.getStorageSync('role');
  const options = ['2.4', '2.6', '2.7', '2.8', '2.9', '3.0', '3.2', '3.6', '4.1']; // 选项数组

  // 当前库存列表查询
  const fetchData = async (value: string) => {
    try {
      setLoading(true);
      let query = db.collection(data_prefix+'stock');
      // 添加搜索条件
      query = query.where({
        name: db.RegExp({
          regexp: value,
          options: 'i'
        }),
      });

      const countRes = await query.count();
      const total = countRes.total;
      console.log("当前库存商品总记录数 count:", total, "company:",data_prefix);

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

  //刷新页面
  useEffect(() => {
    // 监听事件，并在收到事件时执行 refreshHandler
    Taro.eventCenter.on('refreshPageStockList', (keyword: string) => fetchData(keyword));

    // 组件卸载时取消监听，避免内存泄漏
    return () => {
      Taro.eventCenter.off('refreshPageStockList', (keyword: string) => fetchData(keyword));
    };
  }, []);

  useEffect(() => {
    fetchData(selectedValue);
  }, [selectedValue]); // 当 selectedValue 变化时重新获取数据

  // 出库操作
  const handleStockOut = (id: number) => {
    console.log(`商品 ${id} 出库操作`);
    Taro.navigateTo({
      url: `/pages/stockAdd/index?id=${id}&operate=${'plus'}&kw=${selectedValue}`
    });
  };

  // 入库操作
  const handleStockIn = (id: number) => {
    console.log(`商品 ${id} 入库操作`);
    Taro.navigateTo({
      url: `/pages/stockAdd/index?id=${id}&operate=${'add'}&kw=${selectedValue}`
    });
  };

  return (
    <View className='inventory-list'>
      <RadioGroup onChange={(e) => setSelectedValue(e.detail.value)} className='radio-group'>
        {options.map((option, index) => (
          <Radio key={index} value={option} checked={selectedValue === option} className='radio'>{option}</Radio>
        ))}
      </RadioGroup>
      { loading ? (
        <Text>Loading...</Text>
      ) : (
        <View className='list'>
          {inventoryList.map(item => (
            <View className='item' key={item._id}>
              <Text className='name'>{item.name}</Text>
              <Text className='quantity'>{item.quantity}</Text>
              
                <View className='actions'>
                  <Button
                    className='action-btn stock-out-btn'
                    onClick={() => handleStockOut(item._id)}
                  >
                    出库
                  </Button>
                  { role === '会计' && (
                  <Button
                    className='action-btn stock-in-btn'
                    onClick={() => handleStockIn(item._id)}
                  >
                    入库
                  </Button>)}
                </View>
              
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

export default InventoryList;
