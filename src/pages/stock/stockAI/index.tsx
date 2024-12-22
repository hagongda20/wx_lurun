import React, { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { db, getPrefixByCompany } from '../../../utils';
// eslint-disable-next-line import/first
import { View, Button, Image, Input } from '@tarojs/components';
import './index.scss';

const InventoryPage = () => {
  const [image, setImage] = useState(null); // 上传的图片
  const [parsedData, setParsedData] = useState([]); // OCR 原始解析数据
  const [editableData, setEditableData] = useState([]); // 可编辑数据
  const [inventoryTable, setInventoryTable] = useState([]); // 库存表数据
  const [isInventoryLoaded, setIsInventoryLoaded] = useState(false); // 库存数据加载完成标记

  const data_prefix = getPrefixByCompany(Taro.getStorageSync('company'));
  const stockInPerson = Taro.getStorageSync('username');

  // 从数据库加载库存数据
  useEffect(() => {
    const loadInventory = async () => {
      try {
        Taro.showLoading({ title: '数据加载...' });
        let query = db.collection(data_prefix + 'stock');
        const countRes = await query.count();
        const total = countRes.total;

        const batchSize = 20;
        const batchTimes = Math.ceil(total / batchSize);

        let allData = [];
        for (let i = 0; i < batchTimes; i++) {
          let batchQuery = query.skip(i * batchSize).limit(batchSize);
          const res = await batchQuery.get();
          allData = allData.concat(res.data);
        }

        //console.log('-----allData:', allData);
        setInventoryTable(allData); // 保存到状态
        setIsInventoryLoaded(true); // 标记加载完成
        Taro.hideLoading();
      } catch (err) {
        console.error('Failed to fetch inventory:', err);
      }
    };

    loadInventory(); // 加载库存表数据
  }, []);

  // 上传图片（拍照或从相册选择）
  const handleUploadImage = () => {
    Taro.chooseImage({
      count: 1,
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFilePath = res.tempFilePaths[0];
        setImage(tempFilePath);

        try {
          const uploadRes = await Taro.cloud.uploadFile({
            cloudPath: `uploads/${Date.now()}-image.jpg`,
            filePath: tempFilePath,
          });

          const fileID = uploadRes.fileID;
          Taro.showLoading({ title: '数据解析...' });
          const ocrResult = await Taro.cloud.callFunction({
            name: 'ocr',
            data: { fileID },
          });
          Taro.hideLoading();
          if (ocrResult.result && Array.isArray(ocrResult.result.data)) {
            const flatData = ocrResult.result.data;
            console.log('OCR解析的原始数据:', flatData);

            const rows = flatData.reduce((acc, value, idx) => {
              if (idx % 4 === 0) acc.push([]);
              acc[acc.length - 1].push(value);
              return acc;
            }, []);
            console.log('****************************rows', rows);

            // 等待库存数据加载完成后进行匹配
            if (!isInventoryLoaded) {
              console.warn('库存数据尚未加载完成，稍后重试');
              return;
            }

            const parsedRows = rows.map((row) => {
              const ocrName = row[0];
              //console.log('正在处理的 OCR 行:', row);
              //console.log('OCR 名称:', ocrName);
              //console.log('数据库数据：', inventoryTable);

              // 在 inventoryTable 中查找匹配项
              const match = inventoryTable.find((item) => {
                //console.log('对比中: inventoryName:', item.name, 'OCR Name:', ocrName);
                return item.name === ocrName;
              });

              //如果匹配成功，把原库存_id和quantity附加过来
              if(match){
                row.push(match._id, match.quantity); // 将匹配的 _id 和 quantity 附加到 row
                row.push(stockInPerson);//操作员
              }

              return {
                rowData: row, // 原始行数据
                matched: !!match, // 是否找到匹配项
              };
            });

            console.log('OCR解析后的数据:', parsedRows);
            setParsedData(parsedRows);
            setEditableData(parsedRows);
          } else {
            console.error('Invalid OCR result format:', ocrResult.result);
            Taro.showToast({ title: 'OCR解析失败', icon: 'none' });
          }
        } catch (err) {
          console.error('OCR 图片上传或解析失败:', err);
          Taro.showToast({ title: '图片上传或解析失败', icon: 'none' });
        }
      },
    });
  };

  // 上传文件
  const handleUploadFile = () => {
    Taro.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['xlsx', 'xls'], // 支持的文件格式
      success: async (res) => {
        const tempFilePath = res.tempFiles[0].path;
        console.log('选择的 Excel 文件路径:', tempFilePath);
  
        try {
          const uploadRes = await Taro.cloud.uploadFile({
            cloudPath: `uploads/${Date.now()}-file.xlsx`,
            filePath: tempFilePath,
          });
  
          const fileID = uploadRes.fileID;
          console.log('上传的 Excel 文件 fileID:', fileID);
  
          Taro.showLoading({ title: '数据解析中...' });
          const parseResult = await Taro.cloud.callFunction({
            name: 'fileParseData', // 调用云函数 fileParseData
            data: { fileID },
          });
          Taro.hideLoading();
          console.log('parseResult:',parseResult);
          if (parseResult.result && Array.isArray(parseResult.result.data)) {
            const flatData = parseResult.result.data;
            console.log('Excel 解析的原始数据:', flatData);
  
            // 将扁平数组转换为二维数组 (4 个字段为一组)
            const rows = flatData.reduce((acc, value, idx) => {
              if (idx % 4 === 0) acc.push([]);
              acc[acc.length - 1].push(value);
              return acc;
            }, []);
            console.log('转换后的行数据:', rows);
  
            // 等待库存数据加载完成后进行匹配
            if (!isInventoryLoaded) {
              console.warn('库存数据尚未加载完成，稍后重试');
              return;
            }
  
            const parsedRows = rows.map((row) => {
              const excelName = row[0];
              // 在 inventoryTable 中查找匹配项
              const match = inventoryTable.find((item) => item.name === excelName);
  
              // 如果匹配成功，把原库存 _id 和 quantity 附加过来
              if (match) {
                row.push(match._id, match.quantity); // 将匹配的 _id 和 quantity 附加到 row
                row.push(stockInPerson); // 操作员
              }
  
              return {
                rowData: row, // 原始行数据
                matched: !!match, // 是否找到匹配项
              };
            });
  
            console.log('Excel 解析后的数据:', parsedRows);
            setParsedData(parsedRows);
            setEditableData(parsedRows);
          } else {
            console.error('无效的 Excel 解析结果格式:', parseResult.result);
            Taro.showToast({ title: 'Excel 解析失败', icon: 'none' });
          }
        } catch (err) {
          console.error('Excel 文件上传或解析失败:', err);
          Taro.showToast({ title: '文件上传或解析失败', icon: 'none' });
        }
      },
    });
  };
  

  // 更新编辑数据
  const handleUpdateCell = (rowIndex, colIndex, value) => {
    const updatedData = [...editableData];
    updatedData[rowIndex].rowData[colIndex] = value;

    // 如果修改的是名称列（第 0 列），重新检查匹配
    if (colIndex === 0) {
      const match = inventoryTable.find((item) => item.name === value);
      //如果匹配成功，把原库存_id和quantity附加过来
      if(match){
        updatedData[rowIndex].rowData.push(match._id, match.quantity); // 将匹配的 _id 和 quantity 附加到 row
        updatedData[rowIndex].rowData.push(stockInPerson);//操作员
      }
      updatedData[rowIndex].matched = !!match;
    }

    setEditableData(updatedData); // 更新状态
  };

  // 提交数据
  const handleSubmit = () => {
    // 检查是否存在未匹配的项
    const hasUnmatched = editableData.some((item) => !item.matched);
  
    if (hasUnmatched) {
      // 如果有未匹配的项，给出提示并退出
      Taro.showToast({
        title: '存在未匹配的商品，请检查',
        icon: 'none',
      });
      return; // 退出提交
    }
    Taro.showLoading({ title: '数据上传...' });
    
  
    // 取出纯数据部分
    const formattedData = editableData.map((item) => item.rowData);
    console.log("formattedData:", formattedData);
  
    // 提交数据
    Taro.cloud.callFunction({
      name: 'uploadInventoryData',
      data: { inventoryData: formattedData, data_prefix:data_prefix }, //二维数组
      success: () => {
        Taro.hideLoading(); // 隐藏加载提示
        Taro.showToast({
          title: '数据上传成功',
          icon: 'success',
          duration: 2000, // 提示持续时间，单位为毫秒
        });
        setTimeout(() => {
          Taro.navigateBack(); // 返回上一界面
        }, 2000); // 确保提示显示后再返回，避免界面过快切换
      },
      fail: () => Taro.showToast({ title: '数据上传失败', icon: 'none' }),
    });
  };
  
  return (
    <View className='inventory-page'>
      {/* 拍照/上传按钮 */}
      {isInventoryLoaded && (<Button onClick={handleUploadImage}>拍照/上传图片</Button>)}
      {image && <Image src={image} className='uploaded-image' />}
      {isInventoryLoaded && (<Button onClick={handleUploadFile}>文件上传</Button>)}

      {/* 显示解析的表格数据 */}
      {parsedData.length > 0 && (
        <View className='data-table'>
          {/* 数据总条数展示 */}
          <View className='data-summary'>
          共 {editableData.length} 条数据，{editableData.reduce((sum, row) => sum + Number(row.rowData[1] || 0), 0)}张
          </View>
          {editableData.map((row, rowIndex) => (
            <View key={rowIndex} className='table-row'>
              {/* 第一行显示第一列和第二列 */}
              <View className='table-row-line'>
                {[row.rowData[0], row.rowData[1]].map((cell, colIndex) => (
                  <Input
                    key={`${rowIndex}-row1-${colIndex}`}
                    value={cell}
                    onInput={(e) =>
                      handleUpdateCell(rowIndex, colIndex, e.detail.value) // colIndex 对应列索引
                    }
                    className={`table-cell ${
                      colIndex === 0 ? "first-column" : ""
                    } ${colIndex === 0 && !row.matched ? "cell-error" : ""}`}
                    placeholder='输入内容'
                  />
                ))}
              </View>
        
              {/* 第二行显示第三列和第四列 */}
              <View className='table-row-line'>
                {[row.rowData[2], row.rowData[3]].map((cell, colIndex) => (
                  <Input
                    key={`${rowIndex}-row2-${colIndex}`}
                    value={cell}
                    onInput={(e) =>
                      handleUpdateCell(rowIndex, colIndex + 2, e.detail.value) // colIndex + 2 对应列索引
                    }
                    className='table-cell'
                    placeholder='输入内容'
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 一键上传按钮 */}
      {parsedData.length > 0 && (
        <Button onClick={handleSubmit} className='submit-button'>
          批量出库
        </Button>
      )}
    </View>
  );
};

export default InventoryPage;
