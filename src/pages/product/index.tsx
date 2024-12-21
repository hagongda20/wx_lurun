import Taro from '@tarojs/taro';
import { View, Text, Input, Button, ScrollView, RadioGroup, Radio } from '@tarojs/components';
import './index.scss';
import { useEffect, useState } from 'react';
import {db, getPrefixByCompany,exportToExcel} from '../../utils'
import {AtButton } from 'taro-ui'

// 模拟库存数据
//const mockInventoryData = [
 //   { id: 1, name: '商品1', quantity: 10 },
 //   { id: 2, name: '商品2', quantity: 20 },
///    { id: 3, name: '商品3', quantity: 15 },
//  ];
  
const InventoryList: Taro.FC = () => {
  const [selectedValue, setSelectedValue] = useState(''); // 初始选中值为空
  const [selectedType, setSelectedType] = useState(''); // 初始选中类型为空
  const [inventoryList, setInventoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<{ [key: string]: string[] }>({});

  // 从本地存储获取当前用户的信息
  const data_prefix = getPrefixByCompany(Taro.getStorageSync('company'));
  const role = Taro.getStorageSync('role');

  // 获取商品类型和价格列表
  const fetchOptions = async (value: string, type: string) => {
    try {
      // 使用 db.command.aggregate 来聚合查询，并且获取所有数据
      const res = await db.collection(data_prefix + 'stock')
        .aggregate()
        .match({
          type: { $ne: '' } // 排除类型为空的记录
        })
        .project({
          pricePrefix: db.command.aggregate.substr(['$name', 0, 3]), // 获取名称的前三个字符作为价格前缀
          type: true,  // 保留类型字段
          name: true,  // 保留商品名称字段
          quantity: true, // 保留库存数量字段
          _id: true,
          extra: true,
        })
        .group({
          _id: '$pricePrefix', // 按价格前缀分组
          types: db.command.aggregate.addToSet('$type'), // 收集该前缀对应的所有类型
          names: db.command.aggregate.addToSet('$name'), // 收集该前缀对应的所有商品名称
          stockItems: db.command.aggregate.addToSet({
            name: '$name',
            type: '$type',
            quantity: '$quantity',
            _id: '$_id',
            extra: '$extra',
          }) // 将该前缀下的所有商品项收集到 stockItems 数组
        })
        .sort({
          _id: 1 // 按价格前缀排序
        })
        .end();
  
      console.log('查询结果：', res);
  
      // 处理返回的数据
      const allPrices = res.list.map(item => item._id); // 获取所有价格前缀
      const allOptions = res.list.reduce((acc, item) => {
        acc[item._id] = item.types.sort(); // 将类型进行排序
        return acc;
      }, {});
  
      // 对每个价格前缀下的商品项进行排序，并去掉类型为空的项
      const allData = res.list.flatMap(item => {
        // 过滤掉 type 为空的商品项
        const sortedItems = item.stockItems
          .filter(stockItem => stockItem.type) // 去掉类型为空的商品项
          .sort((a, b) => a.name.localeCompare(b.name)); // 按商品名称排序
        return sortedItems;
      });
  
      // 判断 selectedValue 和 selectedType 是否在选项中
      const validSelectedValue = allPrices.includes(value) ? value : allPrices[0]; // 如果 selectedValue 不在价格前缀中，默认选中第一个
      const validSelectedType = allOptions[validSelectedValue]?.includes(type) ? type : allOptions[validSelectedValue]?.[0] || ''; // 如果 selectedType 不在该价格前缀对应的类型中，默认选中第一个类型
  
      // 更新状态
      console.log('validSelectedValue:',validSelectedValue,'validSelectedType:',validSelectedType)
      setOptions(allOptions);
      setSelectedValue(validSelectedValue); // 设置选中的价格前缀
      setSelectedType(validSelectedType); // 设置选中的类型
  
    } catch (error) {
      console.error('Fetch options error:', error);
    }
  };
  
  // 当前库存列表查询
  const fetchData = async (value: string, type: string) => {
    try {
      setLoading(true);
      let query = db.collection(data_prefix + 'stock');

      // 添加搜索条件
      query = query.where({
        name: db.RegExp({
          regexp: `^${value}`,
          options: 'i'
        }),
      });

      if (type) {
        query = query.where({
          type: type
        });
      }

      const countRes = await query.count();
      const total = countRes.total;
      console.log("当前库存商品总记录数 count:", total, "company:", data_prefix);

      const batchSize = 20;
      const batchTimes = Math.ceil(total / batchSize);

      let allData = [];
      for (let i = 0; i < batchTimes; i++) {
        let batchQuery = query.skip(i * batchSize).limit(batchSize);
        const res = await batchQuery.get();
        allData = allData.concat(res.data);
      }

      console.log("所有数据:", allData);
      allData.sort((a, b) => a.name.localeCompare(b.name));
      setInventoryList(allData);
      setLoading(false);
    } catch (error) {
      console.error('Fetch inventory error:', error);
      setLoading(false);
    }
  };

  // 刷新页面，只执行一遍
  useEffect(() => {
    fetchOptions(selectedValue, selectedType); // 获取商品类型和价格列表
  }, []);


  //刷新页面
  useEffect(() => {
    // 监听事件，并在收到事件时执行 refreshHandler
    Taro.eventCenter.on('refreshPageProductList', (value: string, type: string) => {fetchOptions(value, type);fetchData(value, type)});

    // 组件卸载时取消监听，避免内存泄漏
    return () => {
      Taro.eventCenter.off('refreshPageProductList', (value: string, type: string) => {fetchOptions(value, type);fetchData(value, type)});
    };
  }, []);
 
  useEffect(() => {
    if (selectedValue !== '' && selectedType !== '') {
      fetchData(selectedValue, selectedType); // 数据更新
    }
  }, [selectedValue, selectedType]); // 当 selectedValue 或 selectedType 变化时重新获取数据
  
  // 产品删除
  const handleDelete = async (id: string) => {
    // 根据 id 进行入库操作
    console.log(`商品 ${id} 删除`);
    await db.collection(data_prefix+'stock').doc(id).remove();
    // 更新状态以反映删除的变化
    setInventoryList(prevList => prevList.filter(item => item._id !== id));
    fetchOptions(selectedValue, selectedType);

  };

  // 产品修改
  const handleEdit = (id: string) => {
    console.log(`商品 ${id} 修改`);
    Taro.navigateTo({
      url: `/pages/product/productAdd/index?id=${id}&selectedValue=${selectedValue}&selectedType=${selectedType}`
    });

  };

  // 产品新增
  const handleProdcutAddClick = (id: string) => {
      console.log(`商品新增`);
      Taro.navigateTo({
        url: `/pages/product/productAdd/index?selectedValue=${selectedValue}&selectedType=${selectedType}`
      });

  };

  // 选择价格时默认选中第一个类型
  const handlePriceChange = (e: any) => {
    const price = e.detail.value;
    setSelectedValue(price);
    if (options[price]) {
      setSelectedType(options[price][0] || '');
    }
  };

  //导出数据到excel
  /** 
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
  };*/
  // 导出数据到 Excel
  const handleExport = async (dataList) => {
    try {
      Taro.showLoading({ title: '导出中...' });
  
      // 调用云函数
      const res = await Taro.cloud.callFunction({
        name: 'download', // 云函数名称
        data: {
          dataList, // 要导出的数据类型，例如 'stock' 或 'opRecords'
          data_prefix, // 数据表前缀，根据业务逻辑动态传入
        },
      });
  
      Taro.hideLoading();
  
      if (res.result.code === 0) {
        const fileID = res.result.fileID; // 云存储返回的文件 ID
  
        // 下载文件到本地
        const downloadRes = await Taro.cloud.downloadFile({ fileID });
        const filePath = downloadRes.tempFilePath;
  
        // 提示导出成功，并询问是否打开文件、分享文件或取消操作
        Taro.showActionSheet({
          itemList: ['打开文件', '分享文件'],  // 只有这两个选项
          success: (actionRes) => {
            switch (actionRes.tapIndex) {
              case 0: // 打开文件
                Taro.openDocument({
                  filePath,
                  success: () => {
                    Taro.showToast({ title: '文件已打开', icon: 'success' });
                  },
                  fail: (err) => {
                    console.error('打开文件失败:', err);
                    Taro.showToast({
                      title: '文件打开失败，请重试',
                      icon: 'none',
                    });
                  },
                });
                break;
              case 1: // 分享文件
                Taro.shareFileMessage({
                  filePath: filePath,
                  success: () => {
                    Taro.showToast({
                      title: '文件分享成功',
                      icon: 'success',
                    });
                  },
                  fail: (err) => {
                    console.error('分享失败:', err);
                    Taro.showToast({
                      title: '分享失败，请重试',
                      icon: 'none',
                    });
                  }
                });
                break;
              default:
                break;
            }
          },
          fail: (err) => {
            if (err.errMsg === 'showActionSheet:fail cancel') {
              console.log('用户取消了操作');
            } else {
              console.error('操作失败:', err);
              Taro.showToast({
                title: '操作失败，请重试',
                icon: 'none',
              });
            }
          }
        });
      } else {
        throw new Error(res.result.message || '导出失败');
      }
    } catch (error) {
      console.error('导出数据错误:', error);
      Taro.hideLoading();
      Taro.showToast({
        title: '导出失败，请重试',
        icon: 'none',
        duration: 2000,
      });
    }
  };
  
  
  


  return (
      <ScrollView
        className='inventory-list'
        scrollY
        scrollWithAnimation
      >
      <View className='navbar'>
        {/* 价格单选框 */}
        <RadioGroup onChange={handlePriceChange} className='radio-group'>
          {Object.keys(options)
            .sort((a, b) => a.localeCompare(b)) // 按照价格顺序排序
            .map((price, index) => (
              <Radio key={index} value={price} checked={selectedValue === price} className='radio'>{price}</Radio>
            ))}
        </RadioGroup>
        {/* 商品类型单选框 */}
        <RadioGroup onChange={(e) => setSelectedType(e.detail.value)} className='radio-group'>
          {options[selectedValue] && options[selectedValue].map((type, index) => (
            <Radio key={index} value={type} checked={selectedType === type} className='radio'>{type}</Radio>
          ))}
        </RadioGroup>
      </View>
      <View className='button-container'>
        <AtButton className='btn' onClick={() => handleExport('opRecords')}>35天流水导出</AtButton>
        <AtButton className='btn' onClick={() => handleExport('stock')}>库存导出</AtButton>
        <AtButton className='btn' onClick={handleProdcutAddClick}>产品新增</AtButton>
      </View>
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
      </ScrollView>
  );
};

export default InventoryList;