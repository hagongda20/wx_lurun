const cloud = require('wx-server-sdk');
cloud.init();
const tencentcloud = require("tencentcloud-sdk-nodejs");

// 腾讯云 OCR
const OcrClient = tencentcloud.ocr.v20181119.Client;

exports.main = async (event, context) => {
  const { fileID } = event;

  try {
    console.log("Step 1: Start processing fileID:", fileID);

    // 下载图片文件
    const fileRes = await cloud.downloadFile({ fileID });
    const buffer = fileRes.fileContent;
    console.log("Step 2: File downloaded successfully.");

    // 初始化客户端配置
    const clientConfig = {
      credential: {
        secretId: "AKIDOeiZCcnkTyFKBoDOL4ZxKgsEPRN7uZ2J", // 替换为腾讯云的 SecretId
        secretKey: "BGG6kEWhhbLtGSWO3Ws2b2NVQ7fGkGim", // 替换为腾讯云的 SecretKey
      },
      region: "ap-guangzhou",
      profile: {
        httpProfile: {
          endpoint: "ocr.tencentcloudapi.com",
        },
      },
    };

    // 初始化 OCR 客户端
    const client = new OcrClient(clientConfig);

    console.log("Step 3: Sending OCR request...");

    const req = {
      ImageBase64: buffer.toString("base64"), // 将图片 buffer 转为 base64 格式
    };

    const result = await client.GeneralBasicOCR(req);

    console.log("Step 4: OCR response received:", JSON.stringify(result));

    // 提取返回的文本
    const textLines = result.TextDetections.map(item => item.DetectedText);
    //console.log("Step 5: Text lines extracted:", textLines);
    await cloud.deleteFile({fileList: [fileID],});

    return {
      code: 0,
      data: textLines,
    };
  } catch (error) {
    console.error("OCR processing failed:", error);

    return {
      code: 500,
      error: {
        message: error.message,
        stack: error.stack,
        details: error.response || error, // 返回详细错误信息
      },
    };
  }
};
