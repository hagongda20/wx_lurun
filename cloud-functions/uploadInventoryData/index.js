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

  // Step 1: 数据预处理 - 合并库存变更
  const productMap = {};
  for (const [
    name,
    quantity,
    createTime,
    extra,
    id,
    orginQuantity,
    stockInPerson,
  ] of inventoryData) {
    // 合并库存更新
    if (!productMap[id]) {
      productMap[id] = {
        id,
        name,
        orginQuantity,
        totalQuantity: 0, // 累加出库数量
      };
    }
    productMap[id].totalQuantity += Number(quantity); // 累加出库数量
  }

  const mergedData = Object.entries(productMap).map(([id, data]) => ({
    id,
    ...data,
  }));

  console.log("Merged Data for Stock Update:", mergedData);

  try {
    // Step 2: 开启事务
    const transaction = await db.startTransaction();

    // Step 3: 更新库存数据
    for (const item of mergedData) {
      const { id, name, totalQuantity, orginQuantity } = item;

      // 计算新库存
      const newQuantity = orginQuantity - totalQuantity;
      /** 库存可以为负，所以注释掉
      if (newQuantity < 0) {
        throw new Error(`库存不足：产品 ${name} (ID: ${id}) 的库存不足`);
      }*/

      // 更新库存表
      await transaction.collection(data_prefix + "stock").doc(id).update({
        data: {
          quantity: newQuantity, // 减少库存
        },
      });
    }

    // Step 4: 插入操作记录（不合并，每条记录原样插入）
    for (const [
      name,
      quantity,
      createTime,
      extra,
      id,
      orginQuantity,
      stockInPerson,
    ] of inventoryData) {
      await transaction.collection(data_prefix + "opRecords").add({
        data: {
          productId: id,
          productName: name,
          operationType: "出库",
          operationQuantity: quantity,
          operationTime: createTime,
          createTime: new Date(),
          operationPerson: stockInPerson,
          extra,
        },
      });
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
