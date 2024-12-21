import Taro from '@tarojs/taro';
import { View, Text, Input, Button, ScrollView, RadioGroup, Radio } from '@tarojs/components';
import './index.scss';
import { useEffect, useState } from 'react';
import { db, getPrefixByCompany, exportToExcel } from '../../../utils';
import { AtButton } from 'taro-ui';

const InventoryList: Taro.FC = () => {
  const [selectedValue, setSelectedValue] = useState<string>(''); // 初始选中的价格前缀
  const [inventoryList, setInventoryList] = useState<any[]>([]); // 库存列表
  const [loading, setLoading] = useState<boolean>(true); // 加载状态
  const [options, setOptions] = useState<{ [key: string]: string[] }>({}); // 价格前缀对应的选项

  // 从本地存储获取当前用户信息
  const data_prefix = getPrefixByCompany(Taro.getStorageSync('company'));

  // 获取商品长度列表
  const fetchOptions = async (value: string) => {
    try {
      const res = await db.collection(data_prefix + 'woodenBlank')
        .aggregate()
        .project({
          pricePrefix: db.command.aggregate.substr(['$name', 0, 3]), // 获取前三个字符作为价格前缀
          type: true,
          name: true,
          quantity: true,
          _id: true,
          extra: true,
        })
        .group({
          _id: '$pricePrefix',
          types: db.command.aggregate.addToSet('$type'),
          stockItems: db.command.aggregate.addToSet({
            name: '$name',
            type: '$type',
            quantity: '$quantity',
            _id: '$_id',
            extra: '$extra',
          }),
        })
        .sort({ _id: 1 }) // 按价格前缀排序
        .end();

      // 处理返回数据
      const allPrices = res.list.map(item => item._id); // 获取所有价格前缀
      const allOptions = res.list.reduce((acc, item) => {
        acc[item._id] = item.types.sort(); // 将类型排序
        return acc;
      }, {});
      const validSelectedValue = allPrices.includes(value) ? value : allPrices[0];

      setOptions(allOptions); // 更新价格前缀的选项
      setSelectedValue(validSelectedValue); // 更新选中的价格前缀
    } catch (error) {
      console.error('Fetch options error:', error);
    }
  };

  // 获取当前库存数据
  const fetchData = async (value: string) => {
    try {
      setLoading(true);
      let query = db.collection(data_prefix + 'woodenBlank').where({
        name: db.RegExp({
          regexp: value,
          options: 'i',
        }),
      });

      const countRes = await query.count();
      const total = countRes.total;
      const batchSize = 20;
      const batchTimes = Math.ceil(total / batchSize);

      let allData: any[] = [];
      for (let i = 0; i < batchTimes; i++) {
        const res = await query.skip(i * batchSize).limit(batchSize).get();
        allData = allData.concat(res.data);
      }

      allData.sort((a, b) => a.name.localeCompare(b.name)); // 按名称排序
      setInventoryList(allData);
      setLoading(false);
    } catch (error) {
      console.error('Fetch inventory error:', error);
      setLoading(false);
    }
  };

  // 刷新页面数据
  useEffect(() => {
    fetchOptions(selectedValue);
  }, []);

  useEffect(() => {
    if (selectedValue) {
      fetchData(selectedValue); // 根据选中的价格前缀加载数据
    }
  }, [selectedValue]);

  // 添加 Taro 事件监听
  useEffect(() => {
    const refreshHandler = (value: string) => {
      fetchOptions(value);
      fetchData(value);
    };
    Taro.eventCenter.on('refreshPageProductList', refreshHandler);

    return () => {
      Taro.eventCenter.off('refreshPageProductList', refreshHandler); // 清理监听事件
    };
  }, []);

  // 删除商品
  const handleDelete = async (id: string) => {
    try {
      await db.collection(data_prefix + 'woodenBlank').doc(id).remove();
      setInventoryList(prevList => prevList.filter(item => item._id !== id)); // 更新列表
      fetchOptions(selectedValue); // 刷新选项
    } catch (error) {
      console.error(`删除商品 ${id} 失败:`, error);
    }
  };

  // 修改商品
  const handleEdit = (id: string) => {
    Taro.navigateTo({
      url: `/pages/woodenBlank/woodenBlankProduct/productAdd/index?id=${id}&selectedValue=${selectedValue}`,
    });
  };

  // 新增商品
  const handleProductAddClick = () => {
    Taro.navigateTo({
      url: `/pages/woodenBlank/woodenBlankProduct/productAdd/index?selectedValue=${selectedValue}`,
    });
  };

  // 处理价格前缀变化
  const handlePriceChange = (e: any) => {
    setSelectedValue(e.detail.value);
  };

  //导出数据到excel
  const handleExport = async (dataList) => {
    try {
      Taro.showLoading({ title: '导出中...' });
      await exportToExcel(dataList); // 调用导出函数获取文件路径
      Taro.hideLoading();
    } catch (error) {
      Taro.hideLoading();
      Taro.showToast({
        title: '导出失败，请重试',
        icon: 'none',
        duration: 2000
      });
    }
  };

  return (
    <ScrollView className="inventory-list" scrollY scrollWithAnimation>
      <View className="navbar">
        <RadioGroup onChange={handlePriceChange} className="radio-group">
          {Object.keys(options)
            .sort((a, b) => a.localeCompare(b)) // 对价格前缀排序
            .map((price, index) => (
              <Radio key={index} value={price} checked={selectedValue === price} className="radio">
                {price}
              </Radio>
            ))}
        </RadioGroup>
      </View>
      <View className="button-container">
        <AtButton className="btn" onClick={() => handleExport('woodenBlank')}>
          数据导出
        </AtButton>
        <AtButton className="btn" onClick={handleProductAddClick}>
          产品新增
        </AtButton>
      </View>
      {loading ? (
        <Text>Loading...</Text>
      ) : (
        <View className="list">
          {inventoryList.map(item => (
            <View className="item" key={item._id}>
              <Text className="name">{item.name}</Text>
              <Text className="quantity">{item.quantity}</Text>
              <View className="actions">
                <Button className="action-btn stock-out-btn" onClick={() => handleEdit(item._id)}>
                  修改
                </Button>
                <Button className="action-btn stock-in-btn" onClick={() => handleDelete(item._id)}>
                  删除
                </Button>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

export default InventoryList;
