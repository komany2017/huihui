// ============================================
// 润泉养元后台服务（Node.js >= 18）
// - REST API：小程序数据同步 + 后台管理
// - 数据存储：MySQL（配置 MYSQL_* 环境变量时）或 JSON 文件库（默认/回退）
// - 管理后台：http://localhost:3000/admin/（管理员 admin / admin123；访客只读 guest / guest123）
// ============================================
const http = require('http')
const https = require('https')
const fs = require('fs')
const path = require('path')
const os = require('os')
const crypto = require('crypto')
const store = require('./store')
const { ENTITY_TYPES, MEDIA_DIR } = require('./store')

const PORT = Number(process.env.PORT || 3000)
const ADMIN_USER = process.env.ADMIN_USER || 'admin'
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123'
const GUEST_USER = process.env.GUEST_USER || 'guest'
const GUEST_PASS = process.env.GUEST_PASS || 'guest123'
// 微信支付配置（环境变量）
const WX_APPID = process.env.WX_APPID || ''       // 小程序 AppID
const WX_APP_SECRET = process.env.WX_APP_SECRET || '' // 小程序 AppSecret（仅服务器使用）
const WX_MCH_ID = process.env.WX_MCH_ID || ''     // 商户号
const WX_API_KEY = process.env.WX_API_KEY || ''   // 商户 API 密钥
const WX_NOTIFY_URL = process.env.WX_NOTIFY_URL || '' // 支付回调地址（HTTPS）
// 会话 token（内存态，重启失效），值为 { role: 'admin'|'guest', ts }
const tokens = new Map()

// ---------- 微信支付工具函数 ----------
function wxNonceStr() {
  return crypto.randomBytes(16).toString('hex')
}
function wxTimeStamp() {
  return Math.floor(Date.now() / 1000).toString()
}
// 生成微信支付签名（MD5，按 key 字典序排序拼接）
function wxSign(params, apiKey) {
  const sorted = Object.keys(params).filter(k => params[k] !== undefined && params[k] !== '').sort()
  const str = sorted.map(k => `${k}=${params[k]}`).join('&') + `&key=${apiKey}`
  return crypto.createHash('md5').update(str, 'utf8').digest('hex').toUpperCase()
}
// 对象转 XML
function objToXml(obj) {
  return '<xml>' + Object.keys(obj).map(k => `<${k}><![CDATA[${obj[k]}]]></${k}>`).join('') + '</xml>'
}
// XML 转对象（简易解析）
function xmlToObj(xml) {
  const obj = {}
  const re = /<(\w+)>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/\1>/g
  let m
  while ((m = re.exec(xml)) !== null) obj[m[1]] = m[2]
  return obj
}
// 用小程序 code 换取 openid（AppSecret 仅服务器持有）
function wxCode2Session(code) {
  return new Promise((resolve) => {
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${WX_APPID}&secret=${WX_APP_SECRET}&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`
    https.get(url, { timeout: 8000 }, (r) => {
      let d = ''
      r.on('data', (c) => (d += c))
      r.on('end', () => {
        try { resolve(JSON.parse(d)) } catch { resolve(null) }
      })
    }).on('error', () => resolve(null))
  })
}

// ---------- 外部图片磁盘缓存 ----------
const IMAGE_CACHE_DIR = path.join(__dirname, 'cache', 'images')
const inflight = new Map() // 相同 URL 并发请求合并

function cachePathFor(url, mime) {
  const ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' }[mime] || '.jpg'
  return path.join(IMAGE_CACHE_DIR, crypto.createHash('md5').update(url).digest('hex') + ext)
}

function mimeToType(mime) {
  return /^image\/(png|webp|gif)/.test(mime) ? mime : 'image/jpeg'
}

// 取外部图片：命中缓存直接返回；否则外网下载（8s 超时）后落盘
function getImageCached(url) {
  const existed = inflight.get(url)
  if (existed) return existed
  const job = (async () => {
    fs.mkdirSync(IMAGE_CACHE_DIR, { recursive: true })
    // 1. 缓存命中
    const hit = fs.readdirSync(IMAGE_CACHE_DIR).find(f => f.startsWith(crypto.createHash('md5').update(url).digest('hex')))
    if (hit) {
      const fp = path.join(IMAGE_CACHE_DIR, hit)
      const stat = fs.statSync(fp)
      if (stat.size > 0) {
        const mime = { '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' }[path.extname(hit)] || 'image/jpeg'
        return { file: fp, mime }
      }
    }
    // 2. 外网下载（跟随重定向，8s 超时）
    const result = await new Promise((resolve, reject) => {
      const fetchOnce = (fetchUrl, redirects) => {
        if (redirects > 5) return reject(new Error('重定向次数过多'))
        const u = new URL(fetchUrl)
        const client = u.protocol === 'https:' ? https : http
        const req = client.get(fetchUrl, { timeout: 8000 }, (proxyRes) => {
          if ([301, 302, 303, 307, 308].includes(proxyRes.statusCode) && proxyRes.headers.location) {
            proxyRes.resume()
            return fetchOnce(new URL(proxyRes.headers.location, fetchUrl).href, redirects + 1)
          }
          if (proxyRes.statusCode !== 200) { proxyRes.resume(); return reject(new Error('HTTP ' + proxyRes.statusCode)) }
          const mime = mimeToType(proxyRes.headers['content-type'] || 'image/jpeg')
          const chunks = []
          proxyRes.on('data', c => chunks.push(c))
          proxyRes.on('end', () => {
            const buf = Buffer.concat(chunks)
            if (buf.length === 0) return reject(new Error('空图片'))
            const fp = cachePathFor(url, mime)
            fs.writeFileSync(fp, buf)
            resolve({ file: fp, mime })
          })
        })
        req.on('timeout', () => req.destroy(new Error('下载超时(8s)')))
        req.on('error', reject)
      }
      fetchOnce(url, 0)
    })
    return result
  })().finally(() => inflight.delete(url))
  inflight.set(url, job)
  return job
}

// 启动预热：遍历 catalog 收集外部图片 URL，后台逐个预取进缓存
async function warmImageCache() {
  try {
    const catalog = await store.getCatalog()
    const urls = new Set()
    const collect = (node) => {
      if (!node) return
      if (typeof node === 'string') {
        if (/^https?:\/\//i.test(node) && (/\.(jpe?g|png|webp|gif)(\?|$)/i.test(node) || /picsum\.photos|unsplash|imgur/i.test(node))) urls.add(node)
        return
      }
      if (Array.isArray(node)) return node.forEach(collect)
      if (typeof node === 'object') Object.values(node).forEach(collect)
    }
    Object.values(catalog).forEach(list => Array.isArray(list) && list.forEach(collect))
    let ok = 0, fail = 0
    for (const url of urls) {
      try { await getImageCached(url); ok++ } catch (e) { fail++; console.log(`[image-warm] 失败: ${url} -> ${e.message}`) }
    }
    console.log(`[image-warm] 外部图片预热完成: 成功 ${ok} / 失败 ${fail}（缓存目录 ${IMAGE_CACHE_DIR}）`)
  } catch (e) {
    console.log('[image-warm] 预热失败(不影响服务):', e.message)
  }
}

// ---------- 基础工具 ----------
function json(res, code, data) {
  const body = JSON.stringify(data)
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  })
  res.end(body)
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = ''
    req.on('data', (c) => (raw += c))
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {})
      } catch {
        resolve({})
      }
    })
  })
}

// 读取原始请求体（Buffer），用于 multipart 文件上传
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

// 解析 multipart/form-data，返回 { fields:{}, files:[{name,filename,mime,data}] }
function parseMultipart(buffer, boundary) {
  const result = { fields: {}, files: [] }
  const sep = Buffer.from('--' + boundary)
  const crlf = Buffer.from('\r\n')
  let idx = 0
  while (idx < buffer.length) {
    const s = buffer.indexOf(sep, idx)
    if (s < 0) break
    const e = buffer.indexOf(sep, s + sep.length)
    if (e < 0) break
    const part = buffer.slice(s + sep.length, e)
    // 跳过开头 CRLF
    const content = part.slice(part.indexOf(crlf) + 2)
    const headEnd = content.indexOf('\r\n\r\n')
    if (headEnd < 0) { idx = e; continue }
    const head = content.slice(0, headEnd).toString('utf8')
    const bodyData = content.slice(headEnd + 4)
    // 去掉结尾 CRLF（part 末尾总有一个 \r\n 在 boundary 前）
    const body = bodyData.length >= 2 && bodyData[bodyData.length - 2] === 0x0d && bodyData[bodyData.length - 1] === 0x0a
      ? bodyData.slice(0, bodyData.length - 2)
      : bodyData
    const nameMatch = head.match(/name="([^"]+)"/)
    const filenameMatch = head.match(/filename="([^"]*)"/)
    if (nameMatch) {
      const name = nameMatch[1]
      if (filenameMatch) {
        const filename = filenameMatch[1]
        if (filename) {
          const mimeMatch = head.match(/Content-Type:\s*([^\r\n]+)/i)
          result.files.push({ name, filename, mime: mimeMatch ? mimeMatch[1].trim() : 'application/octet-stream', data: body })
        }
      } else {
        result.fields[name] = body.toString('utf8')
      }
    }
    idx = e
  }
  return result
}

function authOk(req) {
  const h = req.headers['authorization'] || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : ''
  return token && tokens.has(token)
}

/** 返回当前请求的角色：'admin' | 'guest' | null（未登录） */
function authRole(req) {
  const h = req.headers['authorization'] || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : ''
  const info = token && tokens.get(token)
  return info ? info.role : null
}

function nowISO() {
  return new Date().toISOString()
}

// ---------- 微信支付回调 ----------
// 微信以 POST XML 通知支付结果；需验签 → 更新订单为 paid → 返回 XML success
async function handlePayNotify(req, res) {
  // 1. 读取原始 XML body
  const raw = await new Promise((resolve) => {
    let buf = ''
    req.on('data', (c) => (buf += c))
    req.on('end', () => resolve(buf))
    req.on('error', () => resolve(''))
  })
  const reply = (ok) => {
    const code = ok ? 'SUCCESS' : 'FAIL'
    res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' })
    res.end(`<xml><return_code><![CDATA[${code}]]></return_code></xml>`)
  }
  if (!raw) return reply(false)
  const data = xmlToObj(raw)
  // 2. 验签：剔除 sign 字段后用 wxSign 重新签名对比
  if (!WX_API_KEY) {
    console.error('[wxpay-notify] 未配置 WX_API_KEY，无法验签')
    return reply(false)
  }
  const signFromWx = data.sign
  delete data.sign
  const expectedSign = wxSign(data, WX_API_KEY)
  if (signFromWx !== expectedSign) {
    console.error('[wxpay-notify] 签名校验失败', { signFromWx, expectedSign })
    return reply(false)
  }
  // 3. 校验业务结果
  if (data.return_code !== 'SUCCESS' || data.result_code !== 'SUCCESS') {
    console.error('[wxpay-notify] 支付未成功', data)
    return reply(true) // 已收到通知，告诉微信不再重试
  }
  const outTradeNo = data.out_trade_no
  const transactionId = data.transaction_id
  if (!outTradeNo) {
    console.error('[wxpay-notify] 缺少 out_trade_no')
    return reply(false)
  }
  // 4. 通过订单号在所有用户中找到对应订单
  const allOrders = await store.listAllOrders('product')
  const target = allOrders.find((o) => o.id === outTradeNo)
  if (!target) {
    console.error('[wxpay-notify] 未找到订单:', outTradeNo)
    return reply(false) // 让微信重试
  }
  // 5. 更新订单状态为 paid（幂等：重复通知不重复处理）
  if (target.status === 'paid' || target.status === 'shipped' || target.status === 'completed') {
    console.log('[wxpay-notify] 订单已为支付后状态，跳过更新:', outTradeNo)
    return reply(true)
  }
  const merged = {
    ...target,
    status: 'paid',
    payAt: new Date().toISOString(),
    transactionId: transactionId || target.transactionId
  }
  await store.saveProductOrder(target.deviceId, merged)
  console.log(`[wxpay-notify] 订单 ${outTradeNo} 支付成功，交易号 ${transactionId}`)
  return reply(true)
}

// ---------- 路由分发 ----------
async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const p = url.pathname
  const method = req.method

  // 微信支付回调：XML body，必须在 JSON readBody 之前消费 req 流
  if (p === '/api/pay/notify' && method === 'POST') {
    return handlePayNotify(req, res)
  }

  const contentType = req.headers['content-type'] || ''
  const isMultipart = contentType.startsWith('multipart/form-data')
  const body = (['POST', 'PUT', 'PATCH'].includes(method) && !isMultipart) ? await readBody(req) : {}
  let m

  // CORS 预检
  if (method === 'OPTIONS') return json(res, 204, {})

  // ============ 小程序公开 API ============
  if (p === '/api/catalog' && method === 'GET') {
    return json(res, 200, { code: 0, data: await store.getCatalog() })
  }

  // 图片代理：外部图片经服务器中转（避免小程序域名白名单问题）
  // 带磁盘缓存：首次取回后永久走本地磁盘，不再依赖外网（解决服务器访问国外图源慢/超时问题）
  if (p === '/api/image-proxy' && method === 'GET') {
    const target = new URL(req.url, `http://${req.headers.host}`).searchParams.get('url')
    if (!target) return json(res, 400, { code: 1, msg: '缺少 url 参数' })
    try {
      const targetUrl = new URL(target)
      if (!/^https?:$/.test(targetUrl.protocol)) return json(res, 400, { code: 1, msg: 'url 不合法' })
      try {
        const cached = await getImageCached(targetUrl.href)
        res.writeHead(200, { 'Content-Type': cached.mime, 'Cache-Control': 'public, max-age=86400', 'Access-Control-Allow-Origin': '*' })
        fs.createReadStream(cached.file).pipe(res)
      } catch (e) {
        json(res, 502, { code: 1, msg: '图片代理失败: ' + (e.message || e) })
      }
      return
    } catch (e) {
      return json(res, 400, { code: 1, msg: 'url 不合法' })
    }
  }

  // 媒体资源播放（视频/图片，从服务器磁盘读取，公开访问）
  m = p.match(/^\/api\/media\/([^/]+)$/)
  if (m && method === 'GET') {
    const media = await store.getMedia(decodeURIComponent(m[1]))
    if (!media || !media.filePath) return json(res, 404, { code: 1, msg: '媒体不存在' })
    if (!fs.existsSync(media.filePath)) return json(res, 404, { code: 1, msg: '媒体文件已丢失' })
    const stat = fs.statSync(media.filePath)
    res.writeHead(200, {
      'Content-Type': media.mime || 'application/octet-stream',
      'Content-Length': stat.size,
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=86400'
    })
    fs.createReadStream(media.filePath).pipe(res)
    return
  }

  m = p.match(/^\/api\/user\/([^/]+)$/) // /api/user/:deviceId
  if (m && method === 'GET') {
    const deviceId = decodeURIComponent(m[1])
    return json(res, 200, { code: 0, data: await store.getUserDoc(deviceId) })
  }

  m = p.match(/^\/api\/user\/([^/]+)\/profile$/) // PUT profile
  if (m && method === 'PUT') {
    const deviceId = decodeURIComponent(m[1])
    const u = await store.getUserDoc(deviceId)
    u.profile = { ...(u.profile || {}), ...body, updatedAt: nowISO() }
    await store.saveUserDoc(deviceId, u)
    return json(res, 200, { code: 0, data: u.profile })
  }

  m = p.match(/^\/api\/user\/([^/]+)\/booking-orders$/) // POST 预约订单
  if (m && method === 'POST') {
    const deviceId = decodeURIComponent(m[1])
    if (!body.id) return json(res, 400, { code: 1, msg: '缺少订单 id' })
    await store.saveBookingOrder(deviceId, body)
    return json(res, 200, { code: 0 })
  }

  m = p.match(/^\/api\/user\/([^/]+)\/booking-orders\/([^/]+)$/) // PATCH 状态（小程序自动推送）
  if (m && method === 'PATCH') {
    const deviceId = decodeURIComponent(m[1])
    const orders = await store.getBookingOrders(deviceId)
    const o = orders.find((x) => x.id === m[2])
    if (!o) return json(res, 404, { code: 1, msg: '订单不存在' })
    const merged = { ...o, ...body, id: o.id }
    await store.saveBookingOrder(deviceId, merged)
    return json(res, 200, { code: 0, data: merged })
  }

  m = p.match(/^\/api\/user\/([^/]+)\/product-orders$/) // POST 商品订单
  if (m && method === 'POST') {
    const deviceId = decodeURIComponent(m[1])
    if (!body.id) return json(res, 400, { code: 1, msg: '缺少订单 id' })
    await store.saveProductOrder(deviceId, body)
    return json(res, 200, { code: 0 })
  }

  m = p.match(/^\/api\/user\/([^/]+)\/product-orders\/([^/]+)$/) // PATCH 状态（小程序自动推送）
  if (m && method === 'PATCH') {
    const deviceId = decodeURIComponent(m[1])
    const orders = await store.getProductOrders(deviceId)
    const o = orders.find((x) => x.id === m[2])
    if (!o) return json(res, 404, { code: 1, msg: '订单不存在' })
    const merged = { ...o, ...body, id: o.id }
    await store.saveProductOrder(deviceId, merged)
    return json(res, 200, { code: 0, data: merged })
  }

  // 微信支付：统一下单（小程序端调用，获取支付参数）
  m = p.match(/^\/api\/user\/([^/]+)\/product-orders\/([^/]+)\/pay$/)
  if (m && method === 'POST') {
    const deviceId = decodeURIComponent(m[1])
    if (!WX_APPID || !WX_MCH_ID || !WX_API_KEY || !WX_APP_SECRET) {
      return json(res, 500, { code: 1, msg: '服务器未配置微信支付（WX_APPID/WX_APP_SECRET/WX_MCH_ID/WX_API_KEY）' })
    }
    const orders = await store.getProductOrders(deviceId)
    const o = orders.find((x) => x.id === m[2])
    if (!o) return json(res, 404, { code: 1, msg: '订单不存在' })
    if (o.status === 'paid' || o.status === 'shipped' || o.status === 'completed') {
      return json(res, 400, { code: 1, msg: '订单已支付' })
    }
    // 金额转分
    const totalFee = Math.round(Number(o.totalAmount) * 100)
    if (!totalFee || totalFee < 1) return json(res, 400, { code: 1, msg: '订单金额异常' })

    // 用 code 换取 openid（AppSecret 仅服务器持有）
    const code = body.code || ''
    if (!code) return json(res, 400, { code: 1, msg: '缺少 code，无法换取 openid' })
    const sess = await wxCode2Session(code)
    if (!sess || !sess.openid) {
      console.error('[wxpay] code2session 失败:', sess)
      return json(res, 500, { code: 1, msg: '换取 openid 失败', detail: sess })
    }
    const openid = sess.openid

    const nonceStr = wxNonceStr()
    const outTradeNo = o.id // 用订单号作为商户订单号
    const body_str = o.items && o.items[0] ? o.items[0].productName : '润泉养元商品'
    const unifiedParams = {
      appid: WX_APPID,
      mch_id: WX_MCH_ID,
      nonce_str: nonceStr,
      body: body_str,
      out_trade_no: outTradeNo,
      total_fee: totalFee,
      spbill_create_ip: req.socket.remoteAddress || '127.0.0.1',
      notify_url: WX_NOTIFY_URL || `https://${req.headers.host}/api/pay/notify`,
      trade_type: 'JSAPI',
      openid
    }
    unifiedParams.sign = wxSign(unifiedParams, WX_API_KEY)

    // 调用微信统一下单 API
    const xmlData = objToXml(unifiedParams)
    const payRes = await new Promise((resolve) => {
      const payReq = https.request('https://api.mch.weixin.qq.com/pay/unifiedorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/xml', 'Content-Length': Buffer.byteLength(xmlData) }
      }, (payRes2) => {
        let d = ''
        payRes2.on('data', c => d += c)
        payRes2.on('end', () => resolve(xmlToObj(d)))
      })
      payReq.on('error', () => resolve(null))
      payReq.write(xmlData)
      payReq.end()
    })

    if (!payRes || payRes.return_code !== 'SUCCESS') {
      console.error('[wxpay] 统一下单失败:', payRes)
      return json(res, 500, { code: 1, msg: '微信支付下单失败', detail: payRes })
    }
    if (payRes.result_code !== 'SUCCESS') {
      console.error('[wxpay] 业务失败:', payRes)
      return json(res, 500, { code: 1, msg: '微信支付下单失败: ' + (payRes.err_code_des || payRes.err_code || '') })
    }

    // 生成小程序支付参数
    const timeStamp = wxTimeStamp()
    const payNonceStr = wxNonceStr()
    const packageStr = 'prepay_id=' + payRes.prepay_id
    const paySign = wxSign({
      appId: WX_APPID,
      timeStamp,
      nonceStr: payNonceStr,
      package: packageStr,
      signType: 'MD5'
    }, WX_API_KEY)

    // 记录 prepay_id 到订单
    const merged = { ...o, prepayId: payRes.prepay_id, payAt: new Date().toISOString() }
    await store.saveProductOrder(deviceId, merged)

    return json(res, 200, { code: 0, data: {
      timeStamp,
      nonceStr: payNonceStr,
      package: packageStr,
      signType: 'MD5',
      paySign
    }})
  }

  m = p.match(/^\/api\/user\/([^/]+)\/constitution-results$/) // POST 体质报告（同 id 覆盖旧记录）
  if (m && method === 'POST') {
    const deviceId = decodeURIComponent(m[1])
    const u = await store.getUserDoc(deviceId)
    if (!body.id) return json(res, 400, { code: 1, msg: '缺少 id' })
    u.constitutionResults = [body, ...u.constitutionResults.filter((r) => r.id !== body.id)]
    await store.saveUserDoc(deviceId, u)
    return json(res, 200, { code: 0 })
  }

  m = p.match(/^\/api\/user\/([^/]+)\/health-records$/) // POST 健康档案
  if (m && method === 'POST') {
    const deviceId = decodeURIComponent(m[1])
    const u = await store.getUserDoc(deviceId)
    if (!body.id) return json(res, 400, { code: 1, msg: '缺少 id' })
    u.healthRecords = [body, ...u.healthRecords]
    await store.saveUserDoc(deviceId, u)
    return json(res, 200, { code: 0 })
  }

  m = p.match(/^\/api\/user\/([^/]+)\/health-records\/([^/]+)$/) // DELETE 档案
  if (m && method === 'DELETE') {
    const deviceId = decodeURIComponent(m[1])
    const u = await store.getUserDoc(deviceId)
    u.healthRecords = u.healthRecords.filter((r) => r.id !== m[2])
    await store.saveUserDoc(deviceId, u)
    return json(res, 200, { code: 0 })
  }

  // ============ 后台管理 API ============
  if (p === '/api/admin/login' && method === 'POST') {
    let role = null
    if (body.username === ADMIN_USER && body.password === ADMIN_PASS) role = 'admin'
    else if (body.username === GUEST_USER && body.password === GUEST_PASS) role = 'guest'
    if (role) {
      const token = crypto.randomBytes(24).toString('hex')
      tokens.set(token, { role, ts: Date.now() })
      return json(res, 200, { code: 0, data: { token, role } })
    }
    return json(res, 401, { code: 1, msg: '账号或密码错误' })
  }

  if (p.startsWith('/api/admin/')) {
    const role = authRole(req)
    if (!role) return json(res, 401, { code: 1, msg: '未登录或登录已过期' })
    // guest 只读：禁止一切写操作（POST/PUT/PATCH/DELETE）
    if (role === 'guest' && method !== 'GET') {
      return json(res, 403, { code: 1, msg: '访客账号仅支持浏览，不能修改数据' })
    }

    // ---------- 媒体上传（穴位视频等）----------
    if (p === '/api/admin/media' && method === 'POST') {
      if (!isMultipart) return json(res, 400, { code: 1, msg: '需 multipart/form-data 上传' })
      const boundary = contentType.match(/boundary=([^;]+)/)
      if (!boundary) return json(res, 400, { code: 1, msg: '缺少 boundary' })
      const raw = await readRawBody(req)
      const mp = parseMultipart(raw, boundary[1])
      const file = mp.files[0]
      if (!file) return json(res, 400, { code: 1, msg: '未收到文件' })
      // 仅允许图片和视频
      if (!file.mime.startsWith('image/') && !file.mime.startsWith('video/')) {
        return json(res, 400, { code: 1, msg: '仅支持上传图片或视频' })
      }
      // 限制单文件 50MB
      if (file.data.length > 50 * 1024 * 1024) return json(res, 413, { code: 1, msg: '文件过大（上限 50MB）' })
      const entityType = mp.fields.entityType || 'acupoints'
      const entityId = mp.fields.entityId || ''
      const id = crypto.randomBytes(12).toString('hex')
      // 落盘到服务器磁盘目录 uploads/media/
      if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true })
      const ext = path.extname(file.filename) || ''
      const filePath = path.join(MEDIA_DIR, id + ext)
      fs.writeFileSync(filePath, file.data)
      // MySQL 仅存路径与关联关系
      await store.saveMedia(id, entityType, entityId, file.filename, file.mime, file.data.length, filePath)
      const url = `/api/media/${id}`
      return json(res, 200, { code: 0, data: { id, url, filename: file.filename, mime: file.mime, size: file.data.length } })
    }

    // ---------- 媒体删除 ----------
    m = p.match(/^\/api\/admin\/media\/([^/]+)$/)
    if (m && method === 'DELETE') {
      await store.deleteMedia(decodeURIComponent(m[1]))
      return json(res, 200, { code: 0 })
    }

    if (p === '/api/admin/overview' && method === 'GET') {
      const [catalog, userDocs] = await Promise.all([store.getCatalog(), store.listUserDocs()])
      return json(res, 200, {
        code: 0,
        data: {
          userCount: userDocs.length,
          bookingOrders: userDocs.reduce((s, x) => s + x.doc.bookingOrders.length, 0),
          productOrders: userDocs.reduce((s, x) => s + x.doc.productOrders.length, 0),
          healthRecords: userDocs.reduce((s, x) => s + x.doc.healthRecords.length, 0),
          constitutionResults: userDocs.reduce((s, x) => s + x.doc.constitutionResults.length, 0),
          serviceCount: catalog.services.length,
          productCount: catalog.products.length,
          diseaseCount: catalog.diseases.length,
          acupointCount: catalog.acupoints.length,
          storeCount: catalog.stores.length
        }
      })
    }

    if (p === '/api/admin/users' && method === 'GET') {
      const userDocs = await store.listUserDocs()
      const list = userDocs.map(({ deviceId, doc: u }) => ({
        deviceId,
        profile: u.profile,
        counts: {
          bookingOrders: u.bookingOrders.length,
          productOrders: u.productOrders.length,
          healthRecords: u.healthRecords.length,
          constitutionResults: u.constitutionResults.length
        }
      }))
      return json(res, 200, { code: 0, data: list })
    }

    m = p.match(/^\/api\/admin\/user\/([^/]+)$/) // 用户详情
    if (m && method === 'GET') {
      return json(res, 200, { code: 0, data: await store.getUserDoc(decodeURIComponent(m[1])) })
    }

    if (p === '/api/admin/orders' && method === 'GET') {
      const type = url.searchParams.get('type') || 'booking'
      const list = await store.listAllOrders(type)
      return json(res, 200, { code: 0, data: list })
    }

    m = p.match(/^\/api\/admin\/order\/([^/]+)\/(booking|product)\/([^/]+)$/) // PATCH 订单状态
    if (m && method === 'PATCH') {
      const deviceId = decodeURIComponent(m[1])
      const isProduct = m[2] === 'product'
      const orders = isProduct ? await store.getProductOrders(deviceId) : await store.getBookingOrders(deviceId)
      const o = orders.find((x) => x.id === m[3])
      if (!o) return json(res, 404, { code: 1, msg: '订单不存在' })
      const merged = { ...o, ...body, id: o.id }
      if (isProduct) await store.saveProductOrder(deviceId, merged)
      else await store.saveBookingOrder(deviceId, merged)
      return json(res, 200, { code: 0 })
    }

    // ---------- 门店管理（独立 stores 表） ----------
    // 带重试的操作包装（同步失败时自动重试最多 3 次，记录告警）
    async function withRetry(fn, label, maxRetries = 3) {
      let lastErr
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await fn()
        } catch (e) {
          lastErr = e
          console.warn(`[store-sync] ${label} 第 ${attempt} 次尝试失败: ${e.message}`)
          if (attempt < maxRetries) await new Promise((r) => setTimeout(r, 200 * attempt))
        }
      }
      console.error(`[store-sync][ALERT] ${label} 重试 ${maxRetries} 次后仍失败: ${lastErr.message}`)
      throw lastErr
    }

    if (p === '/api/admin/stores' && method === 'GET') {
      const list = await store.getStores()
      return json(res, 200, { code: 0, data: list })
    }

    if (p === '/api/admin/stores' && method === 'POST') {
      if (!body.id || !body.name) return json(res, 400, { code: 1, msg: '缺少 id 或 name' })
      const r = await withRetry(() => store.createStore(body), `createStore:${body.id}`)
      if (!r.ok) return json(res, r.http || 500, { code: 1, msg: r.msg })
      await store.logStoreChange(body.id, 'create', ADMIN_USER, { name: body.name })
      return json(res, 200, { code: 0 })
    }

    if (p === '/api/admin/stores/consistency' && method === 'GET') {
      const result = await store.verifyStoreConsistency()
      return json(res, 200, { code: 0, data: result })
    }

    m = p.match(/^\/api\/admin\/stores\/([^/]+)\/logs$/)
    if (m && method === 'GET') {
      const logs = await store.getStoreLogs(decodeURIComponent(m[1]))
      return json(res, 200, { code: 0, data: logs })
    }

    m = p.match(/^\/api\/admin\/stores\/([^/]+)\/extension$/)
    if (m) {
      const id = decodeURIComponent(m[1])
      if (method === 'GET') {
        const ext = await store.getStoreExtension(id)
        return json(res, 200, { code: 0, data: ext })
      }
      if (method === 'PUT') {
        const r = await withRetry(() => store.saveStoreExtension(id, body), `saveStoreExtension:${id}`)
        if (!r.ok) return json(res, r.http || 500, { code: 1, msg: r.msg })
        await store.logStoreChange(id, 'update_extension', ADMIN_USER, { fields: Object.keys(body) })
        return json(res, 200, { code: 0 })
      }
    }

    m = p.match(/^\/api\/admin\/stores\/([^/]+)\/services$/)
    if (m) {
      const id = decodeURIComponent(m[1])
      if (method === 'GET') {
        const list = await store.getStoreServices(id)
        return json(res, 200, { code: 0, data: list })
      }
      if (method === 'POST') {
        if (!body.serviceId) return json(res, 400, { code: 1, msg: '缺少 serviceId' })
        const r = await withRetry(() => store.saveStoreService(id, body.serviceId, body), `saveStoreService:${id}:${body.serviceId}`)
        if (!r.ok) return json(res, r.http || 500, { code: 1, msg: r.msg })
        await store.logStoreChange(id, 'bind_service', ADMIN_USER, { serviceId: body.serviceId })
        return json(res, 200, { code: 0 })
      }
    }

    m = p.match(/^\/api\/admin\/stores\/([^/]+)\/services\/([^/]+)$/)
    if (m && method === 'DELETE') {
      const id = decodeURIComponent(m[1])
      const sid = decodeURIComponent(m[2])
      const r = await store.deleteStoreService(id, sid)
      if (!r.ok) return json(res, r.http || 500, { code: 1, msg: r.msg })
      await store.logStoreChange(id, 'unbind_service', ADMIN_USER, { serviceId: sid })
      return json(res, 200, { code: 0 })
    }

    m = p.match(/^\/api\/admin\/stores\/([^/]+)$/)
    if (m) {
      const id = decodeURIComponent(m[1])
      if (method === 'GET') {
        const s = await store.getStore(id)
        if (!s) return json(res, 404, { code: 1, msg: '门店不存在' })
        return json(res, 200, { code: 0, data: s })
      }
      if (method === 'PUT') {
        const r = await withRetry(() => store.updateStore(id, body), `updateStore:${id}`)
        if (!r.ok) return json(res, r.http || 500, { code: 1, msg: r.msg })
        await store.logStoreChange(id, 'update', ADMIN_USER, { fields: Object.keys(body) })
        return json(res, 200, { code: 0 })
      }
      if (method === 'DELETE') {
        const r = await store.deleteStore(id)
        if (!r.ok) return json(res, r.http || 500, { code: 1, msg: r.msg })
        await store.logStoreChange(id, 'delete', ADMIN_USER, {})
        return json(res, 200, { code: 0 })
      }
    }

    // 更新 / 删除指定记录（两级路径，需在单级路径之前匹配）
    m = p.match(/^\/api\/admin\/catalog\/([^/]+)\/([^/]+)$/)
    if (m && (method === 'PUT' || method === 'DELETE')) {
      const type = m[1]
      if (!ENTITY_TYPES.includes(type)) return json(res, 404, { code: 1, msg: '未知集合' })
      const r =
        method === 'PUT'
          ? await store.updateEntity(type, m[2], body)
          : await store.deleteEntity(type, m[2])
      if (!r.ok) return json(res, r.http || 500, { code: 1, msg: r.msg })
      return json(res, 200, { code: 0 })
    }

    m = p.match(/^\/api\/admin\/catalog\/([^/]+)$/) // 目录集合
    if (m) {
      const type = m[1]
      if (type === 'timeSlots' && method === 'PUT') {
        await store.saveConfig('timeSlots', Array.isArray(body.items) ? body.items : [])
        return json(res, 200, { code: 0 })
      }
      if (type === 'hotDiseases' && method === 'PUT') {
        await store.saveConfig('hotDiseases', Array.isArray(body.items) ? body.items : [])
        return json(res, 200, { code: 0 })
      }
      if (type === 'categories' && method === 'PUT') {
        const kind = body.kind
        if (!['service', 'product', 'disease'].includes(kind)) return json(res, 400, { code: 1, msg: 'kind 不合法' })
        await store.saveConfig(`categories:${kind}`, Array.isArray(body.items) ? body.items : [])
        return json(res, 200, { code: 0 })
      }
      if (!ENTITY_TYPES.includes(type)) return json(res, 404, { code: 1, msg: '未知集合' })

      if (method === 'GET') return json(res, 200, { code: 0, data: await store.getCollection(type) })

      if (method === 'POST') {
        if (!body.id) return json(res, 400, { code: 1, msg: '缺少 id 字段' })
        const r = await store.createEntity(type, body)
        if (!r.ok) return json(res, r.http || 500, { code: 1, msg: r.msg })
        return json(res, 200, { code: 0 })
      }
    }
  }

  // ============ 管理后台静态页面 ============
  if (p === '/' || p === '/admin' || p.startsWith('/admin/')) {
    let rel = p === '/' || p === '/admin' ? 'index.html' : p.replace(/^\/admin\//, '')
    if (!rel) rel = 'index.html'
    const adminRoot = path.resolve(__dirname, 'admin')
    const file = path.resolve(adminRoot, rel)
    if (!file.startsWith(adminRoot)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' })
      return res.end('Forbidden')
    }
    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      const ext = path.extname(file)
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[ext] || 'application/octet-stream'
      res.writeHead(200, { 'Content-Type': `${mime}; charset=utf-8` })
      return res.end(fs.readFileSync(file))
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    return res.end('Not Found')
  }

  if (p === '/api/health') return json(res, 200, { code: 0, data: { ok: true, time: nowISO(), storage: store.storage } })

  return json(res, 404, { code: 1, msg: '接口不存在' })
}

// ---------- 启动 ----------
async function main() {
  await store.init()
  const dbInfo = require('./store').DB_INFO

  const handler = (req, res) => {
    route(req, res).catch((e) => {
      console.error('[server] 处理异常:', e)
      try {
        json(res, 500, { code: 1, msg: '服务器内部错误' })
      } catch {}
    })
  }

  // HTTPS 支持：配置 SSL_CERT 和 SSL_KEY 环境变量时自动启用
  const SSL_CERT = process.env.SSL_CERT
  const SSL_KEY = process.env.SSL_KEY
  let httpsServer = null
  let httpServer = null

  if (SSL_CERT && SSL_KEY && fs.existsSync(SSL_CERT) && fs.existsSync(SSL_KEY)) {
    // HTTPS 模式：443(或 HTTPS_PORT) 走 HTTPS，80(或 PORT) 跳转
    const httpsPort = Number(process.env.HTTPS_PORT || 443)
    httpsServer = https.createServer({
      cert: fs.readFileSync(SSL_CERT),
      key: fs.readFileSync(SSL_KEY)
    }, handler)
    // HTTP 端口跳转到 HTTPS
    httpServer = http.createServer((req, res) => {
      const host = req.headers.host || `localhost:${httpsPort}`
      res.writeHead(301, { Location: `https://${host.replace(/:\d+$/, '')}${httpsPort === 443 ? '' : ':' + httpsPort}${req.url}` })
      res.end()
    })
    httpServer.listen(PORT, () => {})
    httpsServer.listen(httpsPort, () => {
      const nets = os.networkInterfaces()
      let lan = ''
      for (const list of Object.values(nets)) {
        for (const n of list || []) {
          if (n.family === 'IPv4' && !n.internal) lan = n.address
        }
      }
      console.log('==========================================')
      console.log('  润泉养元后台服务已启动 (HTTPS)')
      console.log(`  存储驱动:   ${store.driver === 'mysql' ? `MySQL @ ${dbInfo.MYSQL_HOST}:${dbInfo.MYSQL_PORT}/${dbInfo.MYSQL_DB}` : `JSON 文件（${dbInfo.DB_FILE}）`}`)
      console.log(`  HTTPS:      https://localhost:${httpsPort}/admin/`)
      if (lan) console.log(`  局域网:     https://${lan}:${httpsPort}/admin/`)
      console.log(`  HTTP跳转:   http://localhost:${PORT} -> https`)
      console.log(`  小程序 API: https://localhost:${httpsPort}/api/`)
      console.log(`  默认账号:   ${ADMIN_USER} / ${ADMIN_PASS}`)
      console.log('==========================================')
      warmImageCache()
    })
  } else {
    // HTTP 模式
    httpServer = http.createServer(handler)
    httpServer.listen(PORT, () => {
      const nets = os.networkInterfaces()
      let lan = ''
      for (const list of Object.values(nets)) {
        for (const n of list || []) {
          if (n.family === 'IPv4' && !n.internal) lan = n.address
        }
      }
      console.log('==========================================')
      console.log('  润泉养元后台服务已启动')
      console.log(`  存储驱动:   ${store.driver === 'mysql' ? `MySQL @ ${dbInfo.MYSQL_HOST}:${dbInfo.MYSQL_PORT}/${dbInfo.MYSQL_DB}` : `JSON 文件（${dbInfo.DB_FILE}）`}`)
      console.log(`  管理后台:   http://localhost:${PORT}/admin/`)
      if (lan) console.log(`  局域网访问: http://${lan}:${PORT}/admin/`)
      console.log(`  小程序 API: http://localhost:${PORT}/api/`)
      console.log(`  默认账号:   ${ADMIN_USER} / ${ADMIN_PASS}`)
      console.log('==========================================')
      warmImageCache()
    })
  }
}

main().catch((e) => {
  console.error('[server] 启动失败:', e)
  process.exit(1)
})
