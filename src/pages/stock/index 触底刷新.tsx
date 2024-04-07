import Taro from '@tarojs/taro';
import { View, Text, Input, Button, ScrollView } from '@tarojs/components';
import './index.scss';
import { useEffect, useState } from 'react';
import { db } from '../../utils';

const InventoryList: Taro.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [inventoryList, setInventoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // 查询库存数据
  const fetchData = async (page, kw) => {
    try {
      setLoading(true);
      const batchSize = 20;
      const res = await db.collection('LuRunStock')
        .where({
          name: db.RegExp({
            regexp: kw,
            options: 'i'
          })
        })
        .skip((page - 1) * batchSize)
        .limit(batchSize)
        .get();

      setInventoryList(prevList => [...prevList, ...res.data]);
      if (res.data.length < batchSize) {
        setHasMore(false);
      }

      
      setLoading(false);
    } catch (error) {
      console.error('Fetch inventory error:', error);
      setLoading(false);
    }
  };

  // 初次加载数据和监听页面显示事件
  useEffect(() => {
    fetchData(page, keyword);

    // 监听页面显示事件
    const handlePageShow = () => {
      const pages = Taro.getCurrentPages();
      //console.log("一共的页面数pages:",pages);
      const prevPage = pages[pages.length - 2];
      if (prevPage && prevPage.$preloadData) {
        const { keyword } = prevPage.$preloadData;
        setKeyword(keyword);
        setPage(1);
        setInventoryList([]);
        setHasMore(true);
        fetchData(1, keyword);
      }
    };

    Taro.eventCenter.on('onPageShow', handlePageShow);

    return () => {
      Taro.eventCenter.off('onPageShow', handlePageShow);
    };
  }, [page, keyword]);

  // 处理关键字输入变化
  const handleKeywordChange = (e: Taro.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.detail.value);
  };

  // 处理搜索按钮点击事件
  const handleSearch = () => {
    setPage(1);
    setInventoryList([]);
    setHasMore(true);
    fetchData(1, keyword);
  };

  // 处理滚动到底部事件
  const handleScrollToLower = () => {
    if (loading || !hasMore) {
      return;
    }
    setPage(prevPage => prevPage + 1);
  };

  // 出库操作
  const handleStockOut = (id: number) => {
    // 根据 id 进行出库操作
    console.log(`商品 ${id} 出库`);
    Taro.navigateTo({
      url: `/pages/stockAdd/index?id=${id}&operate=${'plus'}`
    });
  };

  // 入库操作
  const handleStockIn = (id: number) => {
    // 根据 id 进行入库操作
    console.log(`商品 ${id} 入库`);
    Taro.navigateTo({
      url: `/pages/stockAdd/index?id=${id}&operate=${'add'}`
    });
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
      <ScrollView
        className='list'
        scrollY
        scrollWithAnimation
        onScrollToLower={handleScrollToLower}
        style={{ height: '100vh' }}
      >
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
        {loading && <Text>Loading...</Text>}
        {!loading && !hasMore && <Text className='no-more'>没有更多数据了</Text>}
      </ScrollView>
    </View>
  );
};

export default InventoryList;
