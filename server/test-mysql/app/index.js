// ============================================
// 润泉养元后台服务（Node.js >= 18）
// - REST API：小程序数据同步 + 后台管理
// - 数据存储：MySQL（配置 MYSQL_* 环境变量时）或 JSON 文件库（默认/回退）
// - 管理后台：http://localhost:3000/admin/（默认账号 admin / admin123）
// ============================================
const http = require('http')
const fs = require('fs')
const path = require('path')
const os = require('os')
const crypto = require('crypto')
const store = require('./store')
const { ENTITY_TYPES, MEDIA_DIR } = require('./store')

const PORT = Number(process.env.PORT || 3000)
const ADMIN_USER = process.env.ADMIN_USER || 'admin'
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123'
// 会话 token（内存态，重启失效）
const tokens = new Map()

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

function nowISO() {
  return new Date().toISOString()
}

// ---------- 路由分发 ----------
async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const p = url.pathname
  const method = req.method
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
    const u = await store.getUserDoc(deviceId)
    if (!body.id) return json(res, 400, { code: 1, msg: '缺少订单 id' })
    u.bookingOrders = [body, ...u.bookingOrders.filter((o) => o.id !== body.id)]
    await store.saveUserDoc(deviceId, u)
    return json(res, 200, { code: 0 })
  }

  m = p.match(/^\/api\/user\/([^/]+)\/booking-orders\/([^/]+)$/) // PATCH 状态
  if (m && method === 'PATCH') {
    const deviceId = decodeURIComponent(m[1])
    const u = await store.getUserDoc(deviceId)
    const o = u.bookingOrders.find((x) => x.id === m[2])
    if (!o) return json(res, 404, { code: 1, msg: '订单不存在' })
    Object.assign(o, body)
    await store.saveUserDoc(deviceId, u)
    return json(res, 200, { code: 0 })
  }

  m = p.match(/^\/api\/user\/([^/]+)\/product-orders$/) // POST 商品订单
  if (m && method === 'POST') {
    const deviceId = decodeURIComponent(m[1])
    const u = await store.getUserDoc(deviceId)
    if (!body.id) return json(res, 400, { code: 1, msg: '缺少订单 id' })
    u.productOrders = [body, ...u.productOrders.filter((o) => o.id !== body.id)]
    await store.saveUserDoc(deviceId, u)
    return json(res, 200, { code: 0 })
  }

  m = p.match(/^\/api\/user\/([^/]+)\/product-orders\/([^/]+)$/) // PATCH 状态
  if (m && method === 'PATCH') {
    const deviceId = decodeURIComponent(m[1])
    const u = await store.getUserDoc(deviceId)
    const o = u.productOrders.find((x) => x.id === m[2])
    if (!o) return json(res, 404, { code: 1, msg: '订单不存在' })
    Object.assign(o, body)
    await store.saveUserDoc(deviceId, u)
    return json(res, 200, { code: 0 })
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
    if (body.username === ADMIN_USER && body.password === ADMIN_PASS) {
      const token = crypto.randomBytes(24).toString('hex')
      tokens.set(token, Date.now())
      return json(res, 200, { code: 0, data: { token } })
    }
    return json(res, 401, { code: 1, msg: '账号或密码错误' })
  }

  if (p.startsWith('/api/admin/')) {
    if (!authOk(req)) return json(res, 401, { code: 1, msg: '未登录或登录已过期' })

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
          acupointCount: catalog.acupoints.length
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
      const key = type === 'product' ? 'productOrders' : 'bookingOrders'
      const userDocs = await store.listUserDocs()
      const list = []
      for (const { deviceId, doc: u } of userDocs) {
        for (const o of u[key]) list.push({ ...o, deviceId })
      }
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      return json(res, 200, { code: 0, data: list })
    }

    m = p.match(/^\/api\/admin\/order\/([^/]+)\/(booking|product)\/([^/]+)$/) // PATCH 订单状态
    if (m && method === 'PATCH') {
      const deviceId = decodeURIComponent(m[1])
      const u = await store.getUserDoc(deviceId)
      const arr = m[2] === 'product' ? u.productOrders : u.bookingOrders
      const o = arr.find((x) => x.id === m[3])
      if (!o) return json(res, 404, { code: 1, msg: '订单不存在' })
      if (body.status !== undefined) o.status = body.status
      await store.saveUserDoc(deviceId, u)
      return json(res, 200, { code: 0 })
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

  const server = http.createServer((req, res) => {
    route(req, res).catch((e) => {
      console.error('[server] 处理异常:', e)
      try {
        json(res, 500, { code: 1, msg: '服务器内部错误' })
      } catch {}
    })
  })

  server.listen(PORT, () => {
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
  })
}

main().catch((e) => {
  console.error('[server] 启动失败:', e)
  process.exit(1)
})
