import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';
import { View, Text, Input, Button, Radio, RadioGroup, Picker } from '@tarojs/components';
import './index.scss';
import { db, getPrefixByCompany, formatDate, getCurDate } from '../../../utils';
import { AtIcon, AtModal, AtModalHeader, AtModalContent, AtModalAction } from 'taro-ui';

const InventoryList: Taro.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [operationList, setOperationList] = useState<any>([]);
  const [operationType, setOperationType] = useState<string>('出库');
  const [undoModalVisible, setUndoModalVisible] = useState(false);
  const [undoItemId, setUndoItemId] = useState('');
  const [curItem, setCurItem] = useState({});
  const [totalRecords, setTotalRecords] = useState(0);
  //const [selectedDate, setSelectedDate] = useState(getCurDate(new Date())); // 默认选择当天日期
  const [totalQuantity, setTotalQuantity] = useState(0);

  const [startDate, setStartDate] = useState(getCurDate(new Date()));
  const [endDate, setEndDate] = useState(getCurDate(new Date()));

  const data_prefix = getPrefixByCompany(Taro.getStorageSync('company'));
  const username = Taro.getStorageSync('username');
  const belongToCompany = Taro.getStorageSync('belongToCompany');  //是否隶属本公司标志
  const role = Taro.getStorageSync('role');

  useEffect(() => {
    setOperationList([]);
    fetchData();
  }, [operationType, startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = db.collection(data_prefix + 'woodenBlankRecords');

       // 添加搜索条件
       query = query.where({
        productName: db.RegExp({
          regexp: keyword,
          options: 'i'
        }),
        operationType: operationType,
        operationTime: db.command.gte(startDate).and(db.command.lte(endDate))
      });

      //查出所有记录数
      const countRes = await query.count();
      const total = countRes.total;

      const batchSize = 20;
      const batchTimes = Math.ceil(total / batchSize);

      let allData = [];
      for (let i = 0; i < batchTimes; i++) {
        let batchQuery = query.skip(i * batchSize).limit(batchSize);
        const res = await batchQuery.get();
        allData = allData.concat(res.data);
      }
      // 在fetchData函数中处理数据之前
      //let curtotalQuantity = Number(allData[0].operationQuantity); // 先累加第一个值

      // 在排序的同时累加quantity的值
      allData.sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime());


      let curtotalQuantity = allData.reduce((acc, curr) => {
        const quantity = Number(curr.operationQuantity);
        return acc + quantity;
      }, 0);

      console.log('Total Quantity:', curtotalQuantity); // 输出所有item的quantity累计值
      setTotalQuantity(curtotalQuantity);

      setOperationList(allData);
      setTotalRecords(total);
    } catch (error) {
      console.error('Fetch inventory error:', error);
    }
    setLoading(false);
  };

  const handleKeywordChange = (e: Taro.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.detail.value);
  };

  const handleSearch = () => {
    fetchData();
  };

  const handleUndo = (id: string, item) => {
    setUndoItemId(id);
    setCurItem(item);
    setUndoModalVisible(true);
  };

  const confirmUndo = async () => {
    try {
      await db.collection(data_prefix+ 'woodenBlankRecords').doc(undoItemId).remove();

      setOperationList(prevList => prevList.filter(item => item._id !== undoItemId));

      const itemToUndo = operationList.find(item => item._id === undoItemId);
      if (!itemToUndo) {
        throw new Error('Item to undo not found');
      }

      const checkoutProduct = await db.collection(data_prefix+ 'woodenBlank').doc(itemToUndo.productId).get();

      let newQuantity = 0;
      if (itemToUndo.operationType === '入库') {
        newQuantity = Number(checkoutProduct?.data?.quantity) - Number(itemToUndo.operationQuantity);
        setTotalQuantity(totalQuantity-Number(itemToUndo.operationQuantity));
      } else {
        newQuantity = Number(checkoutProduct?.data?.quantity) + Number(itemToUndo.operationQuantity);
        setTotalQuantity(totalQuantity-Number(itemToUndo.operationQuantity));
      }

      const res = await db.collection(data_prefix+ 'woodenBlank').doc(itemToUndo.productId).update({
        data: {
          quantity: newQuantity
        }
      });

      setTotalRecords(totalRecords-1);
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
    } finally {
      setUndoModalVisible(false);
    }
  };

  const cancelUndo = () => {
    setUndoModalVisible(false);
  };

  const handleOperationTypeChange = (e) => {
    setOperationType(e.detail.value);
  };

/** 
  const handleDateChange = (e) => {
    setSelectedDate(e.detail.value);
  };*/

  const handleStartDateChange = (e) => {
    setStartDate(e.detail.value);
  };

  const handleEndDateChange = (e) => {
    setEndDate(e.detail.value);
  };

  return (
    <View className='inventory-list'>
      <View className='date-picker'>
        <View className='picker-container'>
          <Picker mode='date' value={startDate} onChange={handleStartDateChange}>
            <Text>{startDate}</Text><AtIcon value='calendar' size='20' color='#333' />
          </Picker>
        </View>
        <Text className='separator'>---</Text>
        <View className='picker-container'>
          <Picker mode='date' value={endDate} onChange={handleEndDateChange}>
            <Text>{endDate}</Text><AtIcon value='calendar' size='20' color='#333' />
          </Picker>
        </View>
      </View>
      <View className='operation-type'>
        <RadioGroup className='radiogroup' onChange={handleOperationTypeChange} value={operationType}>
          <Radio className='radio' value='出库' checked={operationType === '出库'}>出库</Radio>
          <Radio className='radio' value='入库' checked={operationType === '入库'}>入库</Radio>
        </RadioGroup>  
        <Input
          className='search-input'
          placeholder='请输入商品关键字'
          value={keyword}
          onInput={handleKeywordChange}
        />
        <Button className='search-btn' onClick={handleSearch}>
        <AtIcon value='search' size='18' color='#333' />
        </Button>
      </View>

      {loading ? (
        <Text>Loading...</Text>
      ) : (
      operationType == '出库' ? (
        <View className='operation-list'>
          {operationList.map((item) => (
            <View 
              className={`card ${item.operationPerson != username ? ' accountant' : ''}`}
              key={item._id}
            >
              <View className='card-header'>
                <Text className='productName'>{item.productName}</Text>
                <Text className='operationQuantity'>{'-' + item.operationQuantity}</Text>
                {/**隶属于本公司的销售或会计才有撤销权利 */}
                {belongToCompany && (item.operationPerson === Taro.getStorageSync('username') || role=='会计')&& (  
                  <Button className='action-btn' onClick={() => handleUndo(item._id, item)}>
                    <AtIcon value='close' size='20' color='#333' />
                  </Button>
                )}
              </View>
              <View className='card-body'>
                <Text className='extra'>{item.extra}</Text>
              </View>
              <View className='card-footer'>
                <Text className='operationPerson'>{item.operationPerson}</Text>
                <Text className='operationTime'>{formatDate(item.createTime)}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View className='list'>
          {operationList.map(item => (
            <View className='item' key={item._id}>
              <Text className='productName'>{item.productName}</Text>
              <Text className='operationQuantity'>{'+' + item.operationQuantity}</Text>
              <Text className='operationPerson'>{item.operationPerson}</Text>
              <Text className='operationTime'>{item.operationTime.substring(5)}</Text>
              {/**隶属于本公司的销售或会计才有撤销权利 */}
              {belongToCompany && (item.operationPerson === Taro.getStorageSync('username') || role=='会计') && (
                <View className='actions'>
                  <Button className='action-btn' onClick={() => handleUndo(item._id, item)}>
                    <AtIcon value='reload' size='18' color='#333' />
                  </Button>
                </View>
              )}
            </View>
          ))}
        </View>
      ))}

      <AtModal isOpened={undoModalVisible} onClose={cancelUndo}>
        <AtModalHeader>确认撤销</AtModalHeader>
        <AtModalContent>
          <View>
            <View style={{ marginBottom: '10px' }}>
              <Text>操作类型: {curItem && curItem.operationType}</Text>
            </View>
            <View style={{ marginBottom: '10px' }}>
              <Text>操作数量: {curItem && curItem.operationQuantity}</Text>
            </View>
            <View>
              <Text>备注: {curItem && curItem?.extra}</Text>
            </View>
            <View style={{ marginBottom: '10px' }}>
              <Text>操作员: {curItem && curItem.operationPerson}</Text>
            </View>
            <View>
              <Text>操作时间: {curItem && curItem.operationTime}</Text>
            </View>
          </View>
        </AtModalContent>
        <AtModalAction>
          <Button onClick={cancelUndo}>取消</Button>
          <Button onClick={confirmUndo}>确定</Button>
        </AtModalAction>
      </AtModal>

      {!loading && (
        <View className='all-data-loaded'>
          <Text className='all-data-loaded-text'>共 {totalRecords} 条记录, {totalQuantity} 张</Text>
        </View>
      )}
    </View>
  );
};

export default InventoryList;
