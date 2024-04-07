import Taro from '@tarojs/taro';
import { View, Text, Button, RadioGroup, Radio } from '@tarojs/components';
import './index.scss';
import { useEffect, useState } from 'react';
import { db } from '../../utils';

const InventoryList: Taro.FC = () => {
  const defaultSelectedValue = '2.44';
  const [selectedValue, setSelectedValue] = useState(defaultSelectedValue);
  const [inventoryList, setInventoryList] = useState([]);
  const [loading, setLoading] = useState(true);

  // 当前库存列表查询
  const fetchData = async (value: string) => {
    try {
      setLoading(true);
      let query = db.collection('LuRunStock');

      // 添加搜索条件
      query = query.where({
        name: db.RegExp({
          regexp: value,
          options: 'i'
        })
      });

      const countRes = await query.count();
      const total = countRes.total;
      console.log("当前库存商品总记录数 count:", total);

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

  useEffect(() => {
    fetchData(defaultSelectedValue);
  }, []);

  //刷新页面
  useEffect(() => {
    // 监听事件，并在收到事件时执行 refreshHandler
    Taro.eventCenter.on('refreshPageStockList', (keyword: string) => fetchData(keyword));

    // 组件卸载时取消监听，避免内存泄漏
    return () => {
      Taro.eventCenter.off('refreshPageStockList', (keyword: string) => fetchData(keyword));
    };
  }, []);

  // 处理单选按钮变化
  const handleRadioChange = (value: string) => {
    setSelectedValue(value);
    fetchData(value); // 在这里添加搜索操作
  };

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
      <RadioGroup onChange={(e) => handleRadioChange(e.detail.value)} className='radio-group'>
        <Radio value='2.44' checked={selectedValue === '2.44'} className='radio'>2.44</Radio>
        <Radio value='2.6' checked={selectedValue === '2.6'} className='radio'>2.6</Radio>
        <Radio value='2.7' checked={selectedValue === '2.7'} className='radio'>2.7</Radio>
        <Radio value='2.8' checked={selectedValue === '2.8'} className='radio'>2.8</Radio>
        <Radio value='3.05' checked={selectedValue === '3.05'} className='radio'>3.05</Radio>
        <Radio value='3.2' checked={selectedValue === '3.2'} className='radio'>3.2</Radio>
        <Radio value='3.6' checked={selectedValue === '3.6'} className='radio'>3.6</Radio>
        <Radio value='4.1' checked={selectedValue === '4.1'} className='radio'>4.1</Radio>
      </RadioGroup>
      {loading ? (
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
                <Button
                  className='action-btn stock-in-btn'
                  onClick={() => handleStockIn(item._id)}
                >
                  入库
                </Button>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

export default InventoryList;
