const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV, // 确保使用当前环境
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { inventoryData, data_prefix } = event; // 接收数据和目标集合名称
  const batchSize = 20; // 每次插入的数据量

  if (!Array.isArray(inventoryData) || !data_prefix) {
    return { success: false, message: "Invalid input data" };
  }

  const formattedData = inventoryData.map(([name, quantity, createTime, extra, id, orginQuantity, stockInPerson]) => ({
    name,
    quantity: Number(quantity), // 确保数量是数字类型
    createTime,
    extra,
    id: String(id), // 确保 id 是字符串类型
    orginQuantity: Number(orginQuantity),
    stockInPerson,
  }));

  console.log('formattedData:', formattedData);

  const tasks = []; // 用于存储所有的异步任务

  try {
    // 按批次处理数据
    const batchTimes = Math.ceil(formattedData.length / batchSize);
    for (let i = 0; i < batchTimes; i++) {
      const batch = formattedData.slice(i * batchSize, (i + 1) * batchSize);
      console.log('Processing batch:', batch);

      // 遍历当前批次中的每一条数据
      for (const item of batch) {
        //console.log('Processing item:', item);

        // 更新库存表
        const updateStockTask = db.collection(data_prefix + 'stock')
          .doc(item.id)
          .update({
            data: {
              quantity: String(item.orginQuantity - item.quantity), // 减少库存
            },
          })

        tasks.push(updateStockTask);

        // 添加操作记录
        const addOpRecordTask = db.collection(data_prefix + 'opRecords')
          .add({
            data: {
              productId: item.id,
              productName: item.name,
              operationType: '出库',
              operationQuantity: String(item.quantity),
              operationTime: item.createTime,
              createTime: new Date(),
              operationPerson: item.stockInPerson,
              extra: item.extra,
            },
          });

        tasks.push(addOpRecordTask);
      }
    }

    // 等待所有任务完成
    await Promise.all(tasks);

    return { success: true, message: "Data processed successfully" };
  } catch (err) {
    console.error("Error inserting data:", err);
    return { success: false, message: "Failed to insert data", error: err };
  }
};
