import Taro, { useRouter } from '@tarojs/taro';
import { View, Text, Button } from '@tarojs/components';
import { useEffect, useState } from 'react';
import './index.scss';
import {db} from '../../utils'

interface IDocumentData {
  _id: string;
  _openid: string;
  operationPerson: string;
  operationQuantity: string;
  operationTime: Date;
  operationType: string;
  productId: string;
  productName: number;
}

const StockDetail = () => {
  const [stockDetail, setStockDetail] = useState<IDocumentData[]>([]);
  const router = useRouter();

  const { id } = router.params;

  useEffect(() => {
    // 模拟获取商品出入库明细的数据
    
      const fetchData = async () => {
        try {
          //const db = Taro.cloud.database();
          console.log("库存列表查询");
          const res = await db.collection('operationRecords').where({
            productId: id
          }).get();
          console.log("库存列表:",res);
          setStockDetail(res.data);
          console.log("stockDetail:",stockDetail);
        } catch (error) {
          console.error('Fetch inventory error:', error);
        }
      };
  
      fetchData();
    }, []);

  // 撤销操作的逻辑
  const handleRevoke = (id) => {
    // 这里编写撤销操作的逻辑，可以调用相应的 API 或函数
    console.log(`撤销操作，商品出入库记录 ID: ${id}`);
  };

  return (
    <View className='stock-detail'>
      <View className='header'>
        <Text className='title'>商品出入库明细</Text>
      </View>
      <View className='list'>
        {stockDetail.map((item) => (
          <View className='item' key={item._id}>
            <View className='info'>
              <Text className='info-text'>商品名称：{item?.productName}</Text>
              <Text className='info-text'>数量：{item?.operationQuantity}</Text>
              <Text className='info-text'>类型：{item?.operationType}</Text>
              <Text className='info-text'>时间：{item?.operationTime}</Text>
              <Text className='info-text'>操作人员：{item?.operationPerson}</Text>
            </View>
            <Button
              className='revoke-btn'
              onClick={() => handleRevoke(item._id)}
            >
              撤销
            </Button>
          </View>
        ))}
      </View>
    </View>
  );
};

export default StockDetail;
