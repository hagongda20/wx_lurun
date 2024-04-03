import Taro from '@tarojs/taro';
import { View, Button } from '@tarojs/components';
import {AtButton } from 'taro-ui'
import './index.scss'

const Home = () => {
  const handleInventoryClick = () => {
    Taro.navigateTo({
      url: '/pages/stock/index'
    });
  };

  const handleStockOperationClick = () => {
    Taro.navigateTo({
      url: '/pages/stockOperation/index'
    });
  };

  const handleProductClick = () => {
    Taro.navigateTo({
      url: '/pages/product/index'
    });
  };

  return (
    <View className='home'>
      <View className='btn-container'>
        <AtButton className='btn' onClick={handleInventoryClick}>库存查询</AtButton>
        <AtButton className='btn' onClick={handleStockOperationClick}>出入库操作记录</AtButton>
        <AtButton className='btn' onClick={handleProductClick}>库存产品维护</AtButton>
      </View>
    </View>
  );
};

export default Home;
