import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';
import { View, Text, Input, Button, Radio, RadioGroup } from '@tarojs/components';
import './index.scss';
import { db, getPrefixByCompany } from '../../utils';
import { AtIcon, AtModal, AtModalHeader, AtModalContent, AtModalAction } from 'taro-ui';

const InventoryList: Taro.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [operationList, setOperationList] = useState<any>([]);
  const [operationType, setOperationType] = useState<string>('出库');
  const [undoModalVisible, setUndoModalVisible] = useState(false);
  const [undoItemId, setUndoItemId] = useState('');
  const [curItem, setCurItem] = useState({});
  const [page, setPage] = useState(1); // 当前页数
  const [pageSize, setPageSize] = useState(20); // 每页数据量
  const [totalRecords, setTotalRecords] = useState(0); // 总记录数

  // 从本地存储获取当前用户的信息
  const data_prefix = getPrefixByCompany(Taro.getStorageSync('company'));

  useEffect(() => {
    fetchData();
  }, [page]);

  useEffect(() => {
    setPage(1);
    fetchData();
  }, [operationType]);

  const fetchData = async () => {
    try {
      let query: any = {
        productName: db.RegExp({
          regexp: keyword,
          options: 'i'
        }),
        operationType: operationType
      };

      const res = await db.collection(data_prefix+'opRecords')
        .where(query)
        .orderBy('operationTime', 'desc') // 按照 operationTime 字段倒序排列
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .get();

      if (page === 1) {
        setOperationList(res.data);
      } else {
        setOperationList(prevList => [...prevList, ...res.data]);
      }

      const totalRes = await db.collection(data_prefix+'opRecords')
        .where(query)
        .count();
      
      setTotalRecords(totalRes.total);
    } catch (error) {
      console.error('Fetch inventory error:', error);
    }
  };

  const handleKeywordChange = (e: Taro.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.detail.value);
  };

  const handleSearch = () => {
    setPage(1); // 搜索时回到第一页
    fetchData();
  };

  const handleUndo = (id: string, item) => {
    setUndoItemId(id);
    setCurItem(item);
    setUndoModalVisible(true);
  };

  const confirmUndo = async () => {
    try {
      await db.collection(data_prefix+'opRecords').doc(undoItemId).remove();

      setOperationList(prevList => prevList.filter(item => item._id !== undoItemId));

      const itemToUndo = operationList.find(item => item._id === undoItemId);
      if (!itemToUndo) {
        throw new Error('Item to undo not found');
      }

      const checkoutProduct = await db.collection(data_prefix+'stock').doc(itemToUndo.productId).get();

      let newQuantity = 0;
      if (itemToUndo.operationType === '入库') {
        newQuantity = Number(checkoutProduct?.data?.quantity) - Number(itemToUndo.operationQuantity);
      } else {
        newQuantity = Number(checkoutProduct?.data?.quantity) + Number(itemToUndo.operationQuantity);
      }

      const res = await db.collection(data_prefix+'stock').doc(itemToUndo.productId).update({
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
    } finally {
      setUndoModalVisible(false);
    }
  };

  const cancelUndo = () => {
    setUndoModalVisible(false);
  };

  const reachBottomHandler = () => {
    setPage(prevPage => prevPage + 1);
  };

  return (
    <View className='inventory-list'>
      <View className='operation-type'>
        <RadioGroup onChange={(e) => setOperationType(e.detail.value)} value={operationType}>
          <Radio className='radio' value='出库' checked={operationType === '出库'}>出库</Radio>
          <Radio className='radio' value='入库' checked={operationType === '入库'}>入库</Radio>
        </RadioGroup>
      </View>
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

      { operationType == '出库' ? (
        <View className='operation-list'>
        {operationList.map((item) => (
          <View className='card' key={item._id}>
            <View className='card-header'>
              <Text className='productName'>{item.productName}</Text>
              <Text className='operationQuantity'>{'-' + item.operationQuantity}</Text>
              
              {item.operationPerson === Taro.getStorageSync('username') && (
              <Button className='action-btn' onClick={() => handleUndo(item._id, item)}>
                <AtIcon value='reload' size='18' color='#333' />
              </Button>
              )}
            </View>
            <View className='card-body'>
              <Text className='extra'>{item.extra}</Text>
            </View>
            
            <View className='card-footer'>
              <Text className='operationPerson'>填报员：{item.operationPerson}</Text>
              <Text className='operationTime'>出库时间：{item.operationTime}</Text>
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
              {item.operationPerson === Taro.getStorageSync('username') && (
                <View className='actions'>
                  <Button className='action-btn' onClick={() => handleUndo(item._id, item)}>
                    <AtIcon value='reload' size='18' color='#333' />
                  </Button>
                </View>
              )}
            </View>
          ))}
        </View>
        )

      }

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

      {/* 触底加载提示 */}
      {operationList.length != totalRecords && operationList.length > 0 && operationList.length % pageSize === 0 && (
        <View className='reach-bottom' onClick={reachBottomHandler}>
          <Text className='reach-bottom-text'>点击加载更多数据</Text>
        </View>
      )}

      {/* 数据加载完成提示 */}
      {totalRecords > 0 && operationList.length >= totalRecords && (
        <View className='all-data-loaded'>
          <Text className='all-data-loaded-text'>数据已全部加载完成，共 {totalRecords} 条记录</Text>
        </View>
      )}
    </View>
  );
};

export default InventoryList;
