const https = require('https')
const http = require('http')
const { URL } = require('url')

/* ======================
 * Flask 后端地址（只改这里）
 * ====================== */
const BASE_URL = 'http://101.42.250.129:12345/api'  
// ⚠️ 必须是 http（云函数可以访问，小程序不行）
// ⚠️ 不要以 / 结尾

/* ======================
 * HTTP 请求工具
 * ====================== */
function request({ url, method = 'GET', body = {}, headers = {} }) {
  return new Promise((resolve, reject) => {
    const target = new URL(url)
    const isHttps = target.protocol === 'https:'

    const options = {
      hostname: target.hostname,
      port: target.port || (isHttps ? 443 : 80),
      path: target.pathname + target.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }

    const reqModule = isHttps ? https : http

    const req = reqModule.request(options, res => {
      let data = ''
      res.on('data', chunk => (data += chunk))
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch {
          resolve(data)
        }
      })
    })

    req.on('error', err => {
      reject(err)
    })

    if (method !== 'GET') {
      req.write(JSON.stringify(body))
    }

    req.end()
  })
}

/* ======================
 * 云函数入口
 * ====================== */
exports.main = async (event, context) => {
  const { action } = event

  try {
    /* ---------- 1️⃣ 查询规格 ---------- */
    if (action === 'spec_list') {
      const res = await request({
        url: `${BASE_URL}/inventory/wx/spec/list`,
        method: 'GET'
      })

      return {
        success: true,
        data: res.data ?? res
      }
    }

    /* ---------- 2️⃣ 查询库存 ---------- */
    if (action === 'wx_query') {
      const {
        spec = {},
        page = 1,
        page_size = 20
      } = event

      const res = await request({
        url: `${BASE_URL}/inventory/inventory/wx_query`,
        method: 'POST',
        body: {
          spec,
          page,
          page_size
        }
      })

      return {
        success: true,
        data: res.data ?? res
      }
    }

    /* ---------- 未识别 action ---------- */
    return {
      success: false,
      msg: 'unknown action'
    }
  } catch (err) {
    return {
      success: false,
      error: err.message
    }
  }
}
