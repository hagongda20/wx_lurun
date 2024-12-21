const cloud = require('wx-server-sdk');
const xlsx = require('xlsx');

cloud.init();

exports.main = async (event, context) => {
  const { fileID } = event;

  try {
    console.log("Step 1: Start processing fileID:", fileID);

    // 下载 Excel 文件
    const fileRes = await cloud.downloadFile({ fileID });
    const buffer = fileRes.fileContent;
    console.log("Step 2: File downloaded successfully.");

    // 读取 Excel 文件内容
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0]; // 假设使用第一个工作表
    const sheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1 }); // 将表格内容转换为二维数组
    console.log("Step 3: Excel data converted to JSON:", jsonData);

    // 解析表格数据
    const result = [];
    jsonData.forEach((row) => {
      if (row.length >= 4) {
        // 假设列顺序为：描述、数量、日期、操作人
        const [description, quantity, date, person] = row;
        result.push(String(description).trim());
        result.push(String(quantity).trim());
        result.push(String(date).trim());
        result.push(String(person).trim());
      }
    });

    console.log("Step 4: Parsed data:", result);

    // 删除云存储中的文件
    await cloud.deleteFile({ fileList: [fileID] });
    console.log("Step 5: Temporary file deleted.");

    return {
      code: 0,
      data: result,
    };
  } catch (error) {
    console.error("Excel parsing failed:", error);

    return {
      code: 500,
      error: {
        message: error.message,
        stack: error.stack,
      },
    };
  }
};
