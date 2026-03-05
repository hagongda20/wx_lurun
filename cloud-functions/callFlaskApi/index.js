const cloud = require('wx-server-sdk')
const axios = require('axios') // 你可以用 axios 来进行外部 HTTP 请求

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 初始化云开发环境
})

exports.main = async (event, context) => {
  const { url, method, data, headers } = event

  try {
    const response = await axios({
      url,
      method,
      data,
      headers
    })
    return { success: true, data: response.data }
  } catch (error) {
    console.error(error)
    return { success: false, message: '调用失败' }
  }
}
