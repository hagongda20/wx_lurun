import Taro from '@tarojs/taro';
import { View, Button } from '@tarojs/components';
import {AtButton } from 'taro-ui'
import './index.scss'

const Home = () => {
  const belongToCompany = Taro.getStorageSync('belongToCompany');
  const role = Taro.getStorageSync('role');

  const handleInventoryClick = () => {
    Taro.navigateTo({
      url: '/pages/stock/index'
    });
  };

  const handleStockOperationClick = () => {
    Taro.navigateTo({
      url: '/pages/stock/stockOperation/index'
    });
  };

  const handleProductClick = () => {
    Taro.navigateTo({
      url: '/pages/product/index'
    });
  };

  const handleBlankClick = () => {
    Taro.navigateTo({
      url: '/pages/woodenBlank/index'
    });
  };
  const handleBlankOperationClick = () => {
    Taro.navigateTo({
      url: '/pages/woodenBlank/woodenBlankOperation/index'
    });
  };
  const handleBlankProductClick = () => {
    Taro.navigateTo({
      url: '/pages/woodenBlank/woodenBlankProduct/index'
    });
  };

  const handleStatisticsClick = () => {
    Taro.navigateTo({
      url: '/pages/stock/statistics/index'
    });
  }

  const handleManyOut = () => {
    Taro.navigateTo({
      url: '/pages/stock/stockAI/index'
    });
  }

  return (
    <View className='home'>
      <View className='btn-container'>
        <AtButton className='btn' onClick={handleInventoryClick} disabled={!belongToCompany && role == "common"}>库存查询</AtButton>
        <AtButton className='btn' onClick={handleStockOperationClick} disabled={!belongToCompany || role == "common"}>库存流水</AtButton>
        <AtButton className='btn' onClick={handleProductClick} disabled={!belongToCompany || role == "common"}>库存盘点</AtButton>
        <AtButton className='btn' onClick={handleStatisticsClick} disabled={!belongToCompany  || role == "common"}>销量统计</AtButton>
        <AtButton className='btn' onClick={handleManyOut} disabled={!belongToCompany || role!="会计"}>批量出库</AtButton>

        <View className='divider' />
        <AtButton className='btn' onClick={handleBlankClick} disabled={!belongToCompany && role == "common"}>坯板查询</AtButton>
        <AtButton className='btn' onClick={handleBlankOperationClick} disabled={!belongToCompany || role == "common"}>坯板流水</AtButton>
        <AtButton className='btn' onClick={handleBlankProductClick} disabled={!belongToCompany || role == "common"}>坯板盘点</AtButton>
        {/** 
        
        <AtButton className='btn' onClick={handleProductClick} disabled>AI出库</AtButton>
        


        <AtButton className='btn' disabled onClick={handleProductClick}>工序设定</AtButton>
        <AtButton className='btn' disabled onClick={handleProductClick}>工序工作量录入</AtButton>
        <AtButton className='btn' disabled onClick={handleProductClick}>工序查询</AtButton>
        <AtButton className='btn' disabled onClick={handleProductClick}>工序核对</AtButton>
        <View className='divider' />
        <AtButton className='btn' disabled onClick={handleProductClick}>一账双录</AtButton>
        <AtButton className='btn' disabled onClick={handleProductClick}>对账审核</AtButton>*/}
      </View>
    </View>
  );
};

export default Home;
