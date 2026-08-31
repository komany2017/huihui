// ============================================
// 颐养堂后台服务（零依赖 Node.js，>=18）
// - REST API：小程序数据同步 + 后台管理
// - 数据存储：server/data/db.json（JSON 文件库）
// - 管理后台：http://localhost:3000/admin/（默认账号 admin / admin123）
// ============================================
const http = require('http')
const fs = require('fs')
const path = require('path')
const os = require('os')
const crypto = require('crypto')
const db = require('./db')
const { seedIfEmpty } = require('./seed')

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

function authOk(req) {
  const h = req.headers['authorization'] || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : ''
  return token && tokens.has(token)
}

function nowISO() {
  return new Date().toISOString()
}

// 通用：目录集合 CRUD（对象型数组，按 id）
const ENTITY_TYPES = ['services', 'stores', 'products', 'diseases', 'acupoints']

function getCollection(type) {
  return db.get().catalog[type]
}

// ---------- 路由分发 ----------
async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const p = url.pathname
  const method = req.method
  const body = ['POST', 'PUT', 'PATCH'].includes(method) ? await readBody(req) : {}

  // CORS 预检
  if (method === 'OPTIONS') return json(res, 204, {})

  // ============ 小程序公开 API ============
  if (p === '/api/catalog' && method === 'GET') {
    return json(res, 200, { code: 0, data: db.get().catalog })
  }

  let m = p.match(/^\/api\/user\/([^/]+)$/) // /api/user/:deviceId
  if (m && method === 'GET') {
    const u = db.getUser(decodeURIComponent(m[1]))
    return json(res, 200, { code: 0, data: u })
  }

  m = p.match(/^\/api\/user\/([^/]+)\/profile$/) // PUT profile
  if (m && method === 'PUT') {
    const u = db.getUser(decodeURIComponent(m[1]))
    u.profile = { ...(u.profile || {}), ...body, updatedAt: nowISO() }
    db.save()
    return json(res, 200, { code: 0, data: u.profile })
  }

  m = p.match(/^\/api\/user\/([^/]+)\/booking-orders$/) // POST 预约订单
  if (m && method === 'POST') {
    const u = db.getUser(decodeURIComponent(m[1]))
    if (!body.id) return json(res, 400, { code: 1, msg: '缺少订单 id' })
    u.bookingOrders = [body, ...u.bookingOrders.filter((o) => o.id !== body.id)]
    db.save()
    return json(res, 200, { code: 0 })
  }

  m = p.match(/^\/api\/user\/([^/]+)\/booking-orders\/([^/]+)$/) // PATCH 状态
  if (m && method === 'PATCH') {
    const u = db.getUser(decodeURIComponent(m[1]))
    const o = u.bookingOrders.find((x) => x.id === m[2])
    if (!o) return json(res, 404, { code: 1, msg: '订单不存在' })
    Object.assign(o, body)
    db.save()
    return json(res, 200, { code: 0 })
  }

  m = p.match(/^\/api\/user\/([^/]+)\/product-orders$/) // POST 商品订单
  if (m && method === 'POST') {
    const u = db.getUser(decodeURIComponent(m[1]))
    if (!body.id) return json(res, 400, { code: 1, msg: '缺少订单 id' })
    u.productOrders = [body, ...u.productOrders.filter((o) => o.id !== body.id)]
    db.save()
    return json(res, 200, { code: 0 })
  }

  m = p.match(/^\/api\/user\/([^/]+)\/product-orders\/([^/]+)$/) // PATCH 状态
  if (m && method === 'PATCH') {
    const u = db.getUser(decodeURIComponent(m[1]))
    const o = u.productOrders.find((x) => x.id === m[2])
    if (!o) return json(res, 404, { code: 1, msg: '订单不存在' })
    Object.assign(o, body)
    db.save()
    return json(res, 200, { code: 0 })
  }

  m = p.match(/^\/api\/user\/([^/]+)\/constitution-results$/) // POST 体质报告（同 id 覆盖旧记录）
  if (m && method === 'POST') {
    const u = db.getUser(decodeURIComponent(m[1]))
    if (!body.id) return json(res, 400, { code: 1, msg: '缺少 id' })
    u.constitutionResults = [body, ...u.constitutionResults.filter((r) => r.id !== body.id)]
    db.save()
    return json(res, 200, { code: 0 })
  }

  m = p.match(/^\/api\/user\/([^/]+)\/health-records$/) // POST 健康档案
  if (m && method === 'POST') {
    const u = db.getUser(decodeURIComponent(m[1]))
    if (!body.id) return json(res, 400, { code: 1, msg: '缺少 id' })
    u.healthRecords = [body, ...u.healthRecords]
    db.save()
    return json(res, 200, { code: 0 })
  }

  m = p.match(/^\/api\/user\/([^/]+)\/health-records\/([^/]+)$/) // DELETE 档案
  if (m && method === 'DELETE') {
    const u = db.getUser(decodeURIComponent(m[1]))
    u.healthRecords = u.healthRecords.filter((r) => r.id !== m[2])
    db.save()
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

    if (p === '/api/admin/overview' && method === 'GET') {
      const d = db.get()
      const users = Object.values(d.users)
      return json(res, 200, {
        code: 0,
        data: {
          userCount: users.length,
          bookingOrders: users.reduce((s, u) => s + u.bookingOrders.length, 0),
          productOrders: users.reduce((s, u) => s + u.productOrders.length, 0),
          healthRecords: users.reduce((s, u) => s + u.healthRecords.length, 0),
          constitutionResults: users.reduce((s, u) => s + u.constitutionResults.length, 0),
          serviceCount: d.catalog.services.length,
          productCount: d.catalog.products.length,
          diseaseCount: d.catalog.diseases.length,
          acupointCount: d.catalog.acupoints.length
        }
      })
    }

    if (p === '/api/admin/users' && method === 'GET') {
      const d = db.get()
      const list = Object.entries(d.users).map(([deviceId, u]) => ({
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
      return json(res, 200, { code: 0, data: db.getUser(decodeURIComponent(m[1])) })
    }

    if (p === '/api/admin/orders' && method === 'GET') {
      const type = url.searchParams.get('type') || 'booking'
      const d = db.get()
      const key = type === 'product' ? 'productOrders' : 'bookingOrders'
      const list = []
      for (const [deviceId, u] of Object.entries(d.users)) {
        for (const o of u[key]) list.push({ ...o, deviceId })
      }
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      return json(res, 200, { code: 0, data: list })
    }

    m = p.match(/^\/api\/admin\/order\/([^/]+)\/(booking|product)\/([^/]+)$/) // PATCH 订单状态
    if (m && method === 'PATCH') {
      const u = db.getUser(decodeURIComponent(m[1]))
      const arr = m[2] === 'product' ? u.productOrders : u.bookingOrders
      const o = arr.find((x) => x.id === m[3])
      if (!o) return json(res, 404, { code: 1, msg: '订单不存在' })
      if (body.status !== undefined) o.status = body.status
      db.save()
      return json(res, 200, { code: 0 })
    }

    // 更新 / 删除指定记录（两级路径，需在单级路径之前匹配）
    m = p.match(/^\/api\/admin\/catalog\/([^/]+)\/([^/]+)$/)
    if (m && (method === 'PUT' || method === 'DELETE')) {
      const type = m[1]
      if (!ENTITY_TYPES.includes(type)) return json(res, 404, { code: 1, msg: '未知集合' })
      const arr = getCollection(type)
      const idx = arr.findIndex((x) => x.id === m[2])
      if (idx < 0) return json(res, 404, { code: 1, msg: '记录不存在' })
      if (method === 'PUT') {
        arr[idx] = { ...arr[idx], ...body, id: m[2] }
      } else {
        arr.splice(idx, 1)
      }
      db.save()
      return json(res, 200, { code: 0 })
    }

    m = p.match(/^\/api\/admin\/catalog\/([^/]+)$/) // 目录集合
    if (m) {
      const type = m[1]
      if (type === 'timeSlots' && method === 'PUT') {
        db.get().catalog.timeSlots = Array.isArray(body.items) ? body.items : []
        db.save()
        return json(res, 200, { code: 0 })
      }
      if (type === 'hotDiseases' && method === 'PUT') {
        db.get().catalog.hotDiseases = Array.isArray(body.items) ? body.items : []
        db.save()
        return json(res, 200, { code: 0 })
      }
      if (type === 'categories' && method === 'PUT') {
        const kind = body.kind
        if (!['service', 'product', 'disease'].includes(kind)) return json(res, 400, { code: 1, msg: 'kind 不合法' })
        db.get().catalog.categories[kind] = Array.isArray(body.items) ? body.items : []
        db.save()
        return json(res, 200, { code: 0 })
      }
      if (!ENTITY_TYPES.includes(type)) return json(res, 404, { code: 1, msg: '未知集合' })

      if (method === 'GET') return json(res, 200, { code: 0, data: getCollection(type) })

      if (method === 'POST') {
        if (!body.id) return json(res, 400, { code: 1, msg: '缺少 id 字段' })
        const arr = getCollection(type)
        if (arr.some((x) => x.id === body.id)) return json(res, 400, { code: 1, msg: `id ${body.id} 已存在` })
        arr.push(body)
        db.save()
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

  if (p === '/api/health') return json(res, 200, { code: 0, data: { ok: true, time: nowISO() } })

  return json(res, 404, { code: 1, msg: '接口不存在' })
}

// ---------- 启动 ----------
if (seedIfEmpty()) console.log('[seed] 已从小程序静态数据生成初始库')

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
  console.log('  颐养堂后台服务已启动')
  console.log(`  管理后台:   http://localhost:${PORT}/admin/`)
  if (lan) console.log(`  局域网访问: http://${lan}:${PORT}/admin/`)
  console.log(`  小程序 API: http://localhost:${PORT}/api/`)
  console.log(`  默认账号:   ${ADMIN_USER} / ${ADMIN_PASS}`)
  console.log('==========================================')
})
