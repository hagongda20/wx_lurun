// 云函数入口文件
const cloud = require('wx-server-sdk');
const XLSX = require('xlsx');

cloud.init(); // 初始化云环境

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const db = cloud.database(); // 初始化数据库
    const _ = db.command;

    const data_prefix = event.data_prefix || 'your-data-prefix';
    let allData = [];
    let batchQuery;
    const batchSize = 100;

    // 处理 'stock' 数据导出
    if (event.dataList === 'stock') {
      const countRes = await db.collection(data_prefix + 'stock').count();
      const total = countRes.total;
      const batchTimes = Math.ceil(total / batchSize);

      for (let i = 0; i < batchTimes; i++) {
        batchQuery = db.collection(data_prefix + 'stock').skip(i * batchSize).limit(batchSize);
        const res = await batchQuery.get();
        allData = allData.concat(res.data);
      }
    } 
    // 处理 'opRecords' 数据导出
    else if (event.dataList === 'opRecords') {
      const currentDate = new Date();
      const pastDate = new Date();
      pastDate.setDate(currentDate.getDate() - 35);

      batchQuery = db.collection(data_prefix + 'opRecords').where({
        createTime: db.command.gte(pastDate).and(db.command.lte(currentDate))
      }).limit(batchSize);

      let hasMore = true;
      while (hasMore) {
        const res = await batchQuery.get();
        allData = allData.concat(res.data);
        if (res.data.length < batchSize) {
          hasMore = false;
        } else {
          batchQuery = db.collection(data_prefix + 'opRecords')
            .where({
              createTime: db.command.gte(pastDate).and(db.command.lte(currentDate)),
              _id: db.command.gt(res.data[res.data.length - 1]._id)
            })
            .limit(batchSize);
        }
      }
    } else {
      throw new Error('Invalid dataList parameter');
    }

    // 将数据转换为 Excel 格式
    const worksheet = XLSX.utils.json_to_sheet(allData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    // 上传文件到云存储
    const cloudPath = `exports/${Date.now()}_data.xlsx`; // 文件路径
    const fileRes = await cloud.uploadFile({
      cloudPath: cloudPath,
      fileContent: Buffer.from(excelBuffer), // 上传 Excel 文件
    });

    return {
      code: 0,
      message: '导出成功',
      fileID: fileRes.fileID, // 返回文件 ID
    };
  } catch (error) {
    console.error('导出数据错误:', error);
    return {
      code: 500,
      message: '导出失败，请稍后重试',
      error,
    };
  }
};
