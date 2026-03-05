// 云函数名称: uploadToCOS
const COS = require('cos-nodejs-sdk-v5')
const fs = require('fs')
const path = require('path')

const cos = new COS({
  SecretId: process.env.TENCENT_SECRET_ID,
  SecretKey: process.env.TENCENT_SECRET_KEY
})

exports.main = async (event) => {
  const localPath = event.localPath
  if (!localPath) return { success: false, message: '没有本地路径' }

  try {
    // 将 tempFilePath 转 Buffer
    const fileBuffer = fs.readFileSync(localPath)

    const key = `voice/${Date.now()}.mp3`
    const uploadRes = await new Promise((resolve, reject) => {
      cos.putObject({
        Bucket: '你的bucket名', // 你的 COS bucket
        Region: 'ap-shanghai',   // 对应地域
        Key: key,
        Body: fileBuffer,
        ContentLength: fileBuffer.length
      }, (err, data) => {
        if (err) reject(err)
        else resolve(data)
      })
    })

    // 返回公网 URL
    const url = `https://你的bucket名-账号ID.cos.ap-shanghai.myqcloud.com/${key}`

    return { success: true, url }

  } catch (err) {
    console.error(err)
    return { success: false, message: err.message }
  }
}
