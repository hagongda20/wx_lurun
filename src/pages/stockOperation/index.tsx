import Taro, { useLaunch, useLoad, useReady } from '@tarojs/taro';
import { View, Text, Input, Button } from '@tarojs/components';
import './index.scss';
import { useEffect, useState } from 'react';
import {db, formatDate} from '../../utils'
import { AtIcon } from 'taro-ui';
  
const InventoryList: Taro.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [operationList, setOperationList] = useState<any>([]);
  const fetchData = async () => {
    try {
      //const db = Taro.cloud.database();
      console.log("库存操作记录查询");
      const res = await db.collection('operationRecords').get();
      console.log("出入库操作记录:",res.data);
      setOperationList(res.data);
      console.log("res.data:",operationList);
    } catch (error) {
      console.error('Fetch inventory error:', error);
    }
  };
  useReady(() => {
     
  
     
    }); 

    useEffect(() => {
      fetchData();
    }, []);  // 在 inventoryList 更新时执行打印操作
  
  useEffect(() => {
    console.log("更新后的 inventoryList:", operationList);
  }, [operationList]);  // 在 inventoryList 更新时执行打印操作

  //刷新页面
  /** 
  useEffect(() => {
    const fetchData = async () => {
      try {
        //const db = Taro.cloud.database();
        console.log("库存列表查询");
        const res = await db.collection('LuRunStock').get();
        console.log("res:",res);
        setInventoryList(res.data);
      } catch (error) {
        console.error('Fetch inventory error:', error);
      }
    };

    // 监听事件，并在收到事件时执行 refreshHandler
    Taro.eventCenter.on('refreshPageStockList', fetchData);

    // 组件卸载时取消监听，避免内存泄漏
    return () => {
      Taro.eventCenter.off('refreshPageStockList', fetchData);
    };
  }, []);*/

  // 模糊查询库存列表
  const searchInventory = async (kw: string) => {
      try {
        const res = await db.collection('operationRecords')
          .where({
            productName: db.RegExp({
              regexp: kw,
              options: 'i'  // 'i' 表示忽略大小写
            })
          })
          .get();
          setOperationList(res.data);
      } catch (error) {
        console.error('模糊查询失败:', error);
      }
  };

  // 处理关键字输入变化
  const handleKeywordChange = (e: Taro.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.detail.value);
  };

  // 处理搜索按钮点击事件
  const handleSearch = () => {
    searchInventory(keyword);
  };

  // 处理撤销操作
  const handleUndo = async (id: string, _productId: string, _operationQuantity, _operationType) => {
    try {
      await db.collection('operationRecords').doc(id).remove();
      //fetchData();
      // 更新状态以反映删除的变化
      setOperationList(prevList => prevList.filter(item => item._id !== id));

      const checkoutProduct = await db.collection('LuRunStock').doc(_productId).get();
      console.log('checkoutProduct:',checkoutProduct)

      let newQuantity = 0;
      if(_operationType=='入库'){
        newQuantity = Number(checkoutProduct?.data?.quantity) - Number(_operationQuantity);
      }else{
        newQuantity = Number(checkoutProduct?.data?.quantity) + Number(_operationQuantity);
      }

      const res = await db.collection('LuRunStock').doc(_productId).update({
        data: {
          quantity: newQuantity
        }
      });
      Taro.showToast({
        title: '撤销成功',
        icon: 'success'
      });
    } catch (error) {
      console.error('Undo operation error:', error);
      Taro.showToast({
        title: '撤销失败，请重试',
        icon: 'none'
      });
    }
  };


  return (
    <View className='inventory-list'>
      <View className='search-bar'>
        <Input
          className='search-input'
          placeholder='请输入商品关键字'
          value={keyword}
          onInput={handleKeywordChange}
        />
        <Button className='search-btn' onClick={handleSearch}>
          搜索
        </Button>
      </View>
      <View className='list'>
        {operationList.map(item => (
          <View className='item' key={item._id}>
            <Text className='productName'>{item.productName}</Text>
            <Text className='operationQuantity'>{item.operationType=='入库'? ('+'+item.operationQuantity):('-'+item.operationQuantity)}</Text>
            <Text className='operationPerson'>{item.operationPerson}</Text>
            <Text className='operationTime'>{item.operationTime.substring(5)}</Text> 
            <view className='actions'>
              
              <Button className='action-btn' onClick={() => handleUndo(item._id, item.productId, item.operationQuantity, item.operationType)}>
                <AtIcon value='reload' size='18' color='#333' />
              </Button>
            </view>
            
          </View>
        ))}
      </View>
    </View>
  );
};

export default InventoryList;