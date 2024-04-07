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
        <View className='divider' />

        <AtButton className='btn' disabled onClick={handleProductClick}>工序设定</AtButton>
        <AtButton className='btn' disabled onClick={handleProductClick}>工序工作量录入</AtButton>
        <AtButton className='btn' disabled onClick={handleProductClick}>工序查询</AtButton>
        <AtButton className='btn' disabled onClick={handleProductClick}>工序核对</AtButton>
        <View className='divider' />
        <AtButton className='btn' disabled onClick={handleProductClick}>一账双录</AtButton>
        <AtButton className='btn' disabled onClick={handleProductClick}>一账双录</AtButton>
        <AtButton className='btn' disabled onClick={handleProductClick}>一账双录</AtButton>
        <AtButton className='btn' disabled onClick={handleProductClick}>一账双录</AtButton>
        <AtButton className='btn' disabled onClick={handleProductClick}>一账双录</AtButton>
        <AtButton className='btn' disabled onClick={handleProductClick}>一账双录</AtButton>
        <AtButton className='btn' disabled onClick={handleProductClick}>一账双录</AtButton>
        <AtButton className='btn' disabled onClick={handleProductClick}>一账双录</AtButton>
        <AtButton className='btn' disabled onClick={handleProductClick}>对账审核</AtButton>
        <AtButton className='btn' disabled onClick={handleProductClick}>对账审核</AtButton>
      </View>
    </View>
  );
};

export default Home;
