import Taro, { useReady, usePageScroll } from '@tarojs/taro';
import { View, Text, Input, Button, Radio, RadioGroup } from '@tarojs/components';
import './index.scss';
import { useEffect, useState } from 'react';
import { db } from '../../utils';
import { AtIcon, AtModal } from 'taro-ui';

const InventoryList: Taro.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [operationList, setOperationList] = useState<any>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserName, setCurrentUserName] = useState('');
  const [undoModalVisible, setUndoModalVisible] = useState(false);
  const [undoOperationId, setUndoOperationId] = useState('');
  const [undoProductId, setUndoProductId] = useState('');
  const [undoOperationQuantity, setUndoOperationQuantity] = useState('');
  const [undoOperationType, setUndoOperationType] = useState('出库');
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const fetchData = async (isLoadMore = false) => {
    try {
      setLoading(true);

      const skip = (page - 1) * pageSize;

      const res = await db.collection('operationRecords')
        .where({
          operationType: undoOperationType,
          productName: db.RegExp({
            regexp: keyword,
            options: 'i'
          })
        })
        .skip(skip)
        .limit(pageSize) // Show all items if not loading more
        .get();

      if (res.data.length === 0) {
        setHasMore(false);
        return;
      }

      if (isLoadMore) {
        setOperationList(prevList => [...prevList, ...res.data]);
        setPage(page + 1);
      } else {
        setOperationList(res.data);
        setPage(2);
      }

      setLoading(false);
    } catch (error) {
      console.error('Fetch inventory error:', error);
      setLoading(false);
    }
  };

  useReady(() => {
    const username = Taro.getStorageSync('username');
    setCurrentUserName(username);
    fetchData();
  });

  useEffect(() => {
    fetchData();
  }, []);

  usePageScroll((res) => {
    const { scrollTop, scrollHeight, windowHeight } = res;
    const isReachBottom = scrollHeight - scrollTop === windowHeight;

    if (isReachBottom && !loading && hasMore) {
      fetchData(true);
    }
  });

  const handleKeywordChange = (e: Taro.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.detail.value);
  };

  const handleSearch = () => {
    fetchData();
  };

  const handleUndo = (id: string, productId: string, operationQuantity: number, operationType: string) => {
    setUndoModalVisible(true);
    setUndoOperationId(id);
    setUndoProductId(productId);
    setUndoOperationQuantity(operationQuantity);
    setUndoOperationType(operationType);
  };

  const handleRadioChange = (e: Taro.ChangeEvent<HTMLInputElement>) => {
    const newOperationType = e.detail.value;
    setUndoOperationType(newOperationType);
    setPage(1); // Reset page to 1 when changing operation type
  
    const fetchDataByOperationType = async () => {
      try {
        setLoading(true);
  
        const skip = 0;
        const res = await db.collection('operationRecords')
          .where({
            operationType: newOperationType,
            productName: db.RegExp({
              regexp: keyword,
              options: 'i'
            })
          })
          .skip(skip)
          .limit(pageSize)
          .get();
  
        if (res.data.length === 0) {
          setHasMore(false);
          setOperationList([]);
        } else {
          setOperationList(res.data);
          setHasMore(true);
        }
  
        setLoading(false);
      } catch (error) {
        console.error('Fetch inventory error:', error);
        setLoading(false);
      }
    };
  
    fetchDataByOperationType();
  };
  

  const confirmUndo = async () => {
    try {
      await db.collection('operationRecords').doc(undoOperationId).remove();
      setOperationList(prevList => prevList.filter(item => item._id !== undoOperationId));

      const checkoutProduct = await db.collection('LuRunStock').doc(undoProductId).get();

      let newQuantity = 0;
      if (undoOperationType === '入库') {
        newQuantity = Number(checkoutProduct?.data?.quantity) - Number(undoOperationQuantity);
      } else {
        newQuantity = Number(checkoutProduct?.data?.quantity) + Number(undoOperationQuantity);
      }

      await db.collection('LuRunStock').doc(undoProductId).update({
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

    setUndoModalVisible(false);
  };

  const cancelUndo = () => {
    setUndoModalVisible(false);
  };

  return (
    <View className='inventory-list'>
      <View className='radio-group'>
        <RadioGroup onChange={handleRadioChange} value={undoOperationType}>
          <Radio className='stockradio' value='出库' checked={undoOperationType === '出库'}>出库</Radio>
          <Radio className='stockradio' value='入库' checked={undoOperationType === '入库'}>入库</Radio>
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
      <View className='list'>
        {operationList.map(item => (
          <View className='item' key={item._id}>
            <Text className='productName'>{item.productName}</Text>
            <Text className='operationQuantity'>{item.operationType === '入库' ? ('+' + item.operationQuantity) : ('-' + item.operationQuantity)}</Text>
            <Text className='operationPerson'>{item.operationPerson}</Text>
            <Text className='operationTime'>{item.operationTime.substring(5)}</Text>
            {item.operationPerson === currentUserName && (
              <View className='actions'>
                <Button className='action-btn' onClick={() => handleUndo(item._id, item.productId, item.operationQuantity, item.operationType)}>
                  <AtIcon value='reload' size='18' color='#333' />
                </Button>
              </View>
            )}
          </View>
        ))}
        {loading && <Text>Loading...</Text>}
        {!loading && !hasMore && <Text className='no-more'>没有更多数据了</Text>}
      </View>

      <AtModal
        isOpened={undoModalVisible}
        title='确认撤销'
        cancelText='取消'
        confirmText='确认'
        onClose={cancelUndo}
        onCancel={cancelUndo}
        onConfirm={confirmUndo}
      >
        确定要撤销该操作吗？
      </AtModal>
    </View>
  );
};

export default InventoryList;