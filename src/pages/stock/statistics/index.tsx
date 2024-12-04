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
    console.log(startDate);  // 输出调试信息
    try {
      const result = await db.collection(data_prefix + 'opRecords')
        .aggregate()
        .match({
          operationType: '出库',
          // 使用字符串直接进行日期范围筛选
          operationTime: db.command.gte(startDate).and(db.command.lte(endDate))
        })
        .group({
          // 按产品名称分组
          _id: '$productName',
          // 将 operationQuantity 字符串转换为数字并计算总和
          totalQuantity: db.command.aggregate.sum(db.command.aggregate.toDouble('$operationQuantity'))
        })
        .sort({
          totalQuantity: -1  // 按总数量降序排序
        })
        .limit(1000)
        .end();
  
      console.log(result);  // 输出调试信息
      if (result.list && result.list.length > 0) {
        setRankingData(result.list);
      } else {
        setRankingData([]);
      }
    } catch (error) {
      console.error('Error fetching ranking data with aggregation:', error);
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
              <Text className='ranking-name'>{item._id}</Text>
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
