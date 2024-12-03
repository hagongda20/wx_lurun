import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';
import { View, Text, Picker } from '@tarojs/components';
import './index.scss';
import { db, getPrefixByCompany, getCurDate } from '../../../utils';
import { AtIcon} from 'taro-ui';

const OutboundRanking: Taro.FC = () => {
  const [startDate, setStartDate] = useState(getCurDate(new Date()));
  const [endDate, setEndDate] = useState(getCurDate(new Date()));
  const [loading, setLoading] = useState(false);
  const [rankingData, setRankingData] = useState<any[]>([]);

  const data_prefix = getPrefixByCompany(Taro.getStorageSync('company'));

  useEffect(() => {
    fetchRankingData();
  }, [startDate, endDate]);

  const fetchRankingData = async () => {
    setLoading(true);
    try {
      const query = db
        .collection(data_prefix + 'opRecords')
        .where({
          operationType: '出库',
          operationTime: db.command.gte(startDate).and(db.command.lte(endDate))
        });

      const countRes = await query.count();
      const total = countRes.total;
      const batchSize = 20;
      const batchTimes = Math.ceil(total / batchSize);

      let allData: any[] = [];
      for (let i = 0; i < batchTimes; i++) {
        const batchQuery = query.skip(i * batchSize).limit(batchSize);
        const res = await batchQuery.get();
        allData = allData.concat(res.data);
      }

      // 汇总每个产品的出库数量
      const productMap = allData.reduce((acc, item) => {
        const { productName, operationQuantity } = item;
        if (!acc[productName]) {
          acc[productName] = 0;
        }
        acc[productName] += Number(operationQuantity);
        return acc;
      }, {});

      // 转换为数组并排序
      const sortedRanking = Object.entries(productMap)
        .map(([productName, totalQuantity]) => ({ productName, totalQuantity }))
        .sort((a, b) => b.totalQuantity - a.totalQuantity);

      setRankingData(sortedRanking);
    } catch (error) {
      console.error('Error fetching ranking data:', error);
    }
    setLoading(false);
  };

  const handleStartDateChange = (e) => {
    setStartDate(e.detail.value);
  };

  const handleEndDateChange = (e) => {
    setEndDate(e.detail.value);
  };

  return (
    <View className='ranking'>
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
      {loading ? '加载中...' : (
      <View className='ranking-list'>
        {rankingData.length > 0 ? (
          rankingData.map((item, index) => (
            <View className='ranking-item' key={index}>
              <Text className='ranking-rank'>{index + 1}</Text>
              <Text className='ranking-name'>{item.productName}</Text>
              <Text className='ranking-quantity'>{item.totalQuantity}</Text>
            </View>
          ))
        ) : (
          <Text className='no-data'>暂无数据</Text>
        )}
      </View>)}
    </View>
  );
};

export default OutboundRanking;
