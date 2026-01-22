const https = require('https')
const http = require('http')
const { URL } = require('url')

/* ======================
 * Flask 后端地址
 * ====================== */
const BASE_URL = 'http://101.42.250.129:12345/api' // ⚠️ 不要以 / 结尾
// ⚠️ 必须 http（云函数限制）

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

    req.on('error', err => reject(err))

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
    /* =====================================================
     * 1️⃣ 查询规格列表（微信端）
     * ===================================================== */
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

    /* =====================================================
     * 2️⃣ 微信库存查询（支持每个规格开关）
     * ===================================================== */
    if (action === 'wx_query') {
      const {
        page = 1,
        page_size = 20,
        spec = {} // ⚠️ 每个规格必须包含 enabled + values
      } = event

      // 🔹 构造传给 Flask 的 body
      const body = {
        page,
        page_size,
        spec
      }

      const res = await request({
        url: `${BASE_URL}/inventory/inventory/wx_query`,
        method: 'POST',
        body
      })

      return {
        success: true,
        data: res.data ?? res
      }
    }

    /* =====================================================
     * 未识别 action
     * ===================================================== */
    return {
      success: false,
      msg: 'unknown action'
    }
  } catch (err) {
    console.error('云函数 inventory 错误:', err)
    return {
      success: false,
      error: err.message || 'cloud function error'
    }
  }
}
