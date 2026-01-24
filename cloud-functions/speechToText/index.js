// 云函数名称: asr
const tencentcloud = require("tencentcloud-sdk-nodejs");
const AsrClient = tencentcloud.asr.v20190614.Client;

exports.main = async (event) => {
  const audioUrl = event.audioUrl
  if (!audioUrl) return { success: false, message: "need param 'Url'" }

  try {
    const client = new AsrClient({
      credential: {
        secretId: process.env.TENCENT_SECRET_ID,
        secretKey: process.env.TENCENT_SECRET_KEY,
      },
      region: "ap-shanghai",
      profile: { httpProfile: { endpoint: "asr.tencentcloudapi.com" } }
    })

    // 创建识别任务
    const taskRes = await client.CreateRecTask({
      EngineModelType: "16k_zh",
      ChannelNum: 1,
      ResTextFormat: 0,
      SourceType: 0, // URL方式
      Url: audioUrl
    })

    const taskId = taskRes.Data.TaskId

    // 等待识别结果
    let result = null
    for (let i = 0; i < 10; i++) {
      const statusRes = await client.DescribeTaskStatus({ TaskId: taskId })
      if (statusRes.Data.Status === 2) { // 识别完成
        result = statusRes.Data.Result
        break
      }
      await new Promise(res => setTimeout(res, 1000))
    }

    if (!result) return { success: false, message: '识别超时' }

    return { success: true, text: result }

  } catch (err) {
    console.error(err)
    return { success: false, message: err.message }
  }
}
