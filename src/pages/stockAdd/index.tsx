import Taro, { useRouter } from '@tarojs/taro';
import { View, Text, Input, Button, Picker, Textarea } from '@tarojs/components';
import { useState, useEffect } from 'react';
import './index.scss';
import {db, getCurrentDateTimeString, getPrefixByCompany} from '../../utils'

interface InventoryItem {
  _id: string;
  name: string;
  quantity: number;
  extra:string;
}

const InboundPage = () => {
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [newQuantity, setNewQuantity] = useState<number>();
  const [curQuantity, setcurQuantity] = useState<number>();
  const [selectedDate, setSelectedDate] = useState(getCurrentDateTimeString());
  const [extraContent, setExtraContent] = useState<string>('');

  const router = useRouter();
  const { id, operate, kw} = router.params;
  // 从本地存储获取当前用户的信息
  const data_prefix = getPrefixByCompany(Taro.getStorageSync('company'));

  useEffect(() => {
    // 模拟根据 ID 查询商品信息，实际需要替换成云数据库查询逻辑
    const fetchItem = async () => {
      try {
        // 这里替换成实际的查询商品信息逻辑
        //const res = await queryItemById(id);
        console.log("商品入库：",id);
        const res = await db.collection(data_prefix+'stock').where({
          _id: id
        }).get();
        //console.log("商品：",res);
        setItem(res?.data[0]);
        setcurQuantity(res?.data[0]?.quantity);
      } catch (error) {
        console.error('查询商品信息失败:', error);
      }
    };

    fetchItem();
  }, [id]);

  // 处理时间选择变化
  const handleDateChange = (e) => {
    setSelectedDate(e.detail.value);
  };

  //处理文本区域框变化
  const handleTextareaChange = (e: any) => {
    const value = e.detail.value;
    // 在这里处理文本变化，可以将其存储到 state 中或执行其他操作
    setExtraContent(value);
  };


  const handleQuantityChange = (e: any) => {
    const value = e.detail.value.trim();
    setNewQuantity(value);
  };

  //处理入库
  const handleInbound = async () => {
    if (!newQuantity) {
      Taro.showToast({
        title: '请输入入库数量',
        icon: 'none',
        duration: 1500
      });
      return;
    }

    try {
      //const newQuantity = parseInt(newQuantity);
      if (isNaN(newQuantity) || newQuantity <= 0) {
        throw new Error('请输入有效的入库数量');
      }


      // 执行入库操作，这里可以替换成实际的入库逻辑
      //console.log('入库商品ID:', item?._id, '新增数量:', newQuantity);
      // 更新数据库中商品的数量字段
      const totolQuantity = Number(newQuantity)+Number(curQuantity);
      const res = await db.collection(data_prefix+'stock').doc(id).update({
        data: {
          quantity: totolQuantity
        }
      });
      setcurQuantity(totolQuantity);
      console.log(`商品 ${id} 入库成功，入库数量为 ${newQuantity}，入库后总数量为 ${totolQuantity},备注为${extraContent}`);

      // 从本地存储获取当前用户的信息
      const stockInPerson = Taro.getStorageSync('username');
      // 构建入库操作记录对象
      const operationRecord = {
        productId: id,
        productName: item?.name,
        operationType: '入库',
        operationQuantity: newQuantity,
        operationTime: selectedDate,
        operationPerson: stockInPerson,
        extra: extraContent
      };

      // 将入库操作记录添加到操作记录表中
      const addRecordRes = await db.collection(data_prefix+'opRecords').add({
        data: operationRecord
      });
      console.log('入库操作记录已添加：', addRecordRes);
      console.log('keyword:', kw);
      
      // 入库成功后的操作，例如显示成功提示并返回上一页
      Taro.showToast({
        title: '入库成功',
        icon: 'success',
        duration: 1500
      });
      
      Taro.eventCenter.trigger('refreshPageStockList',kw);
      //Taro.navigateBack();
    } catch (error) {
      console.error('入库失败:', error);
      Taro.showToast({
        title: '入库失败，请重试',
        icon: 'none',
        duration: 1500
      });
    }
  };

  //处理出库
  const handleOutbound = async () => {
    if (!newQuantity) {
      Taro.showToast({
        title: '请输入出库数量',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    try {
      //const newQuantity = parseInt(newQuantity);
      if (isNaN(newQuantity) || newQuantity <= 0) {
        throw new Error('请输入有效的出库数量');
      }


      // 执行入库操作，这里可以替换成实际的入库逻辑
      console.log('出库商品ID:', item?._id);
      console.log('新增数量:', newQuantity);
      // 更新数据库中商品的数量字段
      const totolQuantity = Number(curQuantity)-Number(newQuantity);
      const res = await db.collection(data_prefix+'stock').doc(id).update({
        data: {
          quantity: totolQuantity
        }
      });
      setcurQuantity(totolQuantity);
      console.log(`商品 ${id} 出库成功，出库数量为 ${newQuantity}，出库后总数量为 ${totolQuantity}，备注为${extraContent}`);

      // 从本地存储获取当前用户的信息
      const stockInPerson = Taro.getStorageSync('username');
      // 获取当前时间作为操作时间
      //const operationTime = new Date();
      // 构建入库操作记录对象
      const operationRecord = {
        productId: id,
        productName: item?.name,
        operationType: '出库',
        operationQuantity: newQuantity,
        operationTime: selectedDate,
        operationPerson: stockInPerson,
        extra: extraContent
      };

      // 将入库操作记录添加到操作记录表中
      const addRecordRes = await db.collection(data_prefix+'opRecords').add({
        data: operationRecord
      });
      console.log('库操作记录已添加：', addRecordRes);



      // 入库成功后的操作，例如显示成功提示并返回上一页
      Taro.showToast({
        title: '出库成功',
        icon: 'success',
        duration: 2000
      });
      Taro.eventCenter.trigger('refreshPageStockList',kw);
      //Taro.navigateBack();
    } catch (error) {
      console.error('出库失败:', error);
      Taro.showToast({
        title: '出库失败，请重试',
        icon: 'none',
        duration: 2000
      });
    }
  };

  return (
    <View className='inbound-page'>
      {item && (
        <View className='item-info'>
        <View className='info-row'>
          <Text className='label'>商品名称：</Text>
          <Text className='value'>{item.name}</Text>
        </View>
        <View className='info-row'>
          <Text className='label'>当前数量：</Text>
          <Text className='value'>{curQuantity}</Text>
        </View>
        
      </View>
      )}
      <View className='input-container'>
        <Text className='label'>{operate=="add"? '入库数量：':'出库数量：'}</Text>
        <Input
          className='input'
          type='number'
          placeholder='请输入数量'
          value={newQuantity}
          onInput={handleQuantityChange}
        />
      </View>
      <Picker className="date" mode='date' value={selectedDate || getCurrentDateTimeString()} onChange={handleDateChange}>
          <View className='picker'>
            <Text>选择时间：{selectedDate || getCurrentDateTimeString()}</Text>
          </View>
      </Picker>
      <View className='input-container'>
          <Text className='label'>备注：</Text>
          <Textarea
            className='textarea_value'
            value={extraContent}
            onInput={handleTextareaChange}
          />
      </View>
      <Button className='inbound-btn' onClick={operate=='add'? handleInbound: handleOutbound}>{operate=="add"? '执行入库':'执行出库'}</Button>
      
    </View>
  );
};

export default InboundPage;
