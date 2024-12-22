const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV, // 确保使用当前环境
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { inventoryData, data_prefix } = event; // 接收数据和目标集合名称
  const batchSize = 20; // 每次处理的数据量

  if (!Array.isArray(inventoryData) || !data_prefix) {
    return { success: false, message: "Invalid input data" };
  }

  const formattedData = inventoryData.map(
    ([name, quantity, createTime, extra, id, orginQuantity, stockInPerson]) => ({
      name,
      quantity: Number(quantity), // 确保数量是数字类型
      createTime,
      extra,
      id: String(id), // 确保 id 是字符串类型
      orginQuantity: Number(orginQuantity),
      stockInPerson,
    })
  );

  console.log("formattedData:", formattedData);

  try {
    // 事务处理
    const transaction = await db.startTransaction();
    const batchTimes = Math.ceil(formattedData.length / batchSize);

    for (let i = 0; i < batchTimes; i++) {
      const batch = formattedData.slice(i * batchSize, (i + 1) * batchSize);
      console.log("Processing batch:", batch);

      // 遍历当前批次中的每一条数据
      for (const item of batch) {
        // 更新库存表操作
        await transaction
          .collection(data_prefix + "stock")
          .doc(item.id)
          .update({
            data: {
              quantity: item.orginQuantity - item.quantity, // 减少库存
            },
          });

        // 添加操作记录
        await transaction.collection(data_prefix + "opRecords").add({
          data: {
            productId: item.id,
            productName: item.name,
            operationType: "出库",
            operationQuantity: item.quantity,
            operationTime: item.createTime,
            createTime: new Date(),
            operationPerson: item.stockInPerson,
            extra: item.extra,
          },
        });
      }
    }

    // 提交事务
    await transaction.commit();

    return { success: true, message: "Data processed successfully" };
  } catch (err) {
    console.error("Error processing data:", err);

    // 如果发生错误，回滚事务
    try {
      await transaction.rollback();
    } catch (rollbackErr) {
      console.error("Error during rollback:", rollbackErr);
    }

    return { success: false, message: "Failed to process data", error: err };
  }
};
