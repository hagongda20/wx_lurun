import Taro from '@tarojs/taro';
import { View, Text, Input, Button } from '@tarojs/components';
import './index.scss';
import { useEffect, useState } from 'react';
import {db, getPrefixByCompany} from '../../utils'
import {AtButton } from 'taro-ui'

// 模拟库存数据
//const mockInventoryData = [
 //   { id: 1, name: '商品1', quantity: 10 },
 //   { id: 2, name: '商品2', quantity: 20 },
///    { id: 3, name: '商品3', quantity: 15 },
//  ];
  
  const InventoryList: Taro.FC = () => {
    const [keyword, setKeyword] = useState('');
    const [inventoryList, setInventoryList] = useState([]);
    const [loading, setLoading] = useState(true);

    const data_prefix = getPrefixByCompany(Taro.getStorageSync('company'));

    // 当前库存列表查询
    // eslint-disable-next-line @typescript-eslint/no-shadow
    const fetchData = async (keyword: string) => {
      try {
        const countRes = await db.collection(data_prefix+'stock').count();
        const total = countRes.total;
        console.log("当前库存商品总记录数 count:", total);
  
        const batchSize = 20; // 每次查询的数据量
        const batchTimes = Math.ceil(total / batchSize); // 需要分几次查询
  
        let allData = [];
        for (let i = 0; i < batchTimes; i++) {
          const res = await db.collection(data_prefix+'stock').where({
            name: db.RegExp({
              regexp: keyword,
              options: keyword ? 'i' : '' // 如果 keyword 存在则设置为 'i'，否则为空字符串
            })
          }).skip(i * batchSize).limit(batchSize).get();
          allData = allData.concat(res.data);
        }
  
        console.log("所有数据:", allData);
        setInventoryList(allData);
        setLoading(false); // 数据加载完成后设置 loading 为 false
      } catch (error) {
        console.error('Fetch inventory error:', error);
        setLoading(false); // 如果出现错误也要设置 loading 为 false
      }
    };
  
    useEffect(() => {
        fetchData(keyword);
      }, []); 

    //刷新页面
    useEffect(() => {
      // 监听事件，并在收到事件时执行 refreshHandler
      // eslint-disable-next-line @typescript-eslint/no-shadow
      Taro.eventCenter.on('refreshPageProductList', (keyword: string) => fetchData(keyword));
  
      // 组件卸载时取消监听，避免内存泄漏
      return () => {
        // eslint-disable-next-line @typescript-eslint/no-shadow
        Taro.eventCenter.off('refreshPageProductList', (keyword: string) => fetchData(keyword));
      };
    }, []);
  
    // 处理关键字输入变化
    const handleKeywordChange = (e: Taro.ChangeEvent<HTMLInputElement>) => {
      setKeyword(e.detail.value);
    };
  
    // 处理搜索按钮点击事件
    const handleSearch = () => {
      fetchData(keyword);
    };
  
    
  
    // 产品删除
    const handleDelete = async (id: string) => {
      // 根据 id 进行入库操作
      console.log(`商品 ${id} 删除`);
      await db.collection(data_prefix+'stock').doc(id).remove();
      // 更新状态以反映删除的变化
      setInventoryList(prevList => prevList.filter(item => item._id !== id));

    };

    // 产品修改
    const handleEdit = (id: string) => {
      console.log(`商品 ${id} 修改`);
      Taro.navigateTo({
        url: `/pages/product/productAdd/index?id=${id}&keyword=${keyword}`
      });

    };

    // 产品新增
    const handleProdcutAddClick = (id: string) => {
        console.log(`商品新增`);
        Taro.navigateTo({
          url: `/pages/product/productAdd/index?keyword=${keyword}`
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
          <Button className='search-btn' onClick={handleSearch} disabled={loading}>
            搜索
          </Button>
          
        </View>
        <AtButton className='btn' onClick={handleProdcutAddClick}>产品新增</AtButton>
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
                  onClick={() => handleEdit(item._id)}
                >
                  修改
                </Button>
                <Button
                  className='action-btn stock-in-btn'
                  onClick={() => handleDelete(item._id)}
                >
                  删除
                </Button>
                
                
                
              </View>
            </View>
          ))}
        </View>)}
      </View>
    );
  };
  
  export default InventoryList;