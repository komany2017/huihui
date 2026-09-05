// ============================================
// 统一数据存储层（双驱动：MySQL / JSON 文件）
// - 配置了 MYSQL_HOST（或 DB_DRIVER=mysql）时使用 MySQL
// - 否则使用 JSON 文件库（db.js），零依赖兜底
// - MySQL 连接失败自动回退 JSON，服务不中断
// - 首次使用 MySQL 且为空库时：自动导入已有 db.json，否则播种内置数据
//
// 接口（全部 async）：
//   init() / driver
//   getCatalog()
//   getCollection(type) / createEntity(type, entity) / updateEntity(type, id, patch) / deleteEntity(type, id)
//   saveConfig(name, arr)        // timeSlots / hotDiseases / categories:service|product|disease
//   getUserDoc(deviceId) / saveUserDoc(deviceId, doc) / listUserDocs()
// ============================================
const path = require('path')
const db = require('./db')
const { buildSeed } = require('./seed')

const ENTITY_TYPES = ['services', 'stores', 'products', 'diseases', 'acupoints']
const CONFIG_KEYS = ['timeSlots', 'hotDiseases', 'categories:service', 'categories:product', 'categories:disease']

const MYSQL_HOST = process.env.MYSQL_HOST
const MYSQL_PORT = Number(process.env.MYSQL_PORT || 3306)
const MYSQL_USER = process.env.MYSQL_USER || 'root'
const MYSQL_PASS = process.env.MYSQL_PASS || ''
const MYSQL_DB = process.env.MYSQL_DB || 'ruanquan'
const wantMysql = process.env.DB_DRIVER === 'mysql' || !!MYSQL_HOST

let driver = 'json'
let pool = null

// ---------- 通用工具 ----------
function clone(v) {
  return typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v))
}

function emptyUserDoc() {
  return { profile: null, bookingOrders: [], productOrders: [], constitutionResults: [], healthRecords: [] }
}

function emptyCatalog() {
  return {
    services: [],
    stores: [],
    timeSlots: [],
    products: [],
    diseases: [],
    acupoints: [],
    categories: {
      service: [{ id: 'all', name: '全部' }],
      product: [{ id: 'all', name: '全部' }],
      disease: [{ id: 'all', name: '全部' }]
    },
    hotDiseases: []
  }
}

function fail(http, msg) {
  return { ok: false, http, msg }
}

// ---------- JSON 文件驱动 ----------
const jsonDriver = {
  async init() {
    if (!db.get().catalog.services.length && !db.get().catalog.products.length) {
      db.get().catalog = buildSeed()
      db.save()
      console.log('[store] JSON 库为空，已播种内置数据')
    }
  },
  async getCatalog() {
    const c = clone(db.get().catalog)
    // 门店数据从独立结构读取
    c.stores = await this.getStores()
    return c
  },
  async getCollection(type) {
    return clone(db.get().catalog[type])
  },
  async createEntity(type, entity) {
    const arr = db.get().catalog[type]
    if (arr.some((x) => x.id === entity.id)) return fail(400, `id ${entity.id} 已存在`)
    arr.push(entity)
    db.save()
    return { ok: true }
  },
  async updateEntity(type, id, patch) {
    const arr = db.get().catalog[type]
    const idx = arr.findIndex((x) => x.id === id)
    if (idx < 0) return fail(404, '记录不存在')
    arr[idx] = { ...arr[idx], ...patch, id }
    db.save()
    return { ok: true }
  },
  async deleteEntity(type, id) {
    const arr = db.get().catalog[type]
    const idx = arr.findIndex((x) => x.id === id)
    if (idx < 0) return fail(404, '记录不存在')
    arr.splice(idx, 1)
    db.save()
    return { ok: true }
  },
  async saveConfig(name, arr) {
    const c = db.get().catalog
    if (name.startsWith('categories:')) c.categories[name.split(':')[1]] = arr
    else c[name] = arr
    db.save()
    return { ok: true }
  },
  async getUserDoc(deviceId) {
    const d = db.get()
    if (!d.users[deviceId]) d.users[deviceId] = emptyUserDoc()
    return clone(d.users[deviceId])
  },
  async saveUserDoc(deviceId, doc) {
    db.get().users[deviceId] = doc
    db.save()
    return { ok: true }
  },
  async listUserDocs() {
    return Object.entries(db.get().users).map(([deviceId, doc]) => ({ deviceId, doc: clone(doc) }))
  },
  // ---- 订单（JSON 驱动继续存在 users 文档内，接口与 MySQL 驱动对齐） ----
  async getBookingOrders(deviceId) {
    const d = db.get()
    if (!d.users[deviceId]) return []
    return clone(d.users[deviceId].bookingOrders || [])
  },
  async saveBookingOrder(deviceId, order) {
    const d = db.get()
    if (!d.users[deviceId]) d.users[deviceId] = emptyUserDoc()
    const arr = d.users[deviceId].bookingOrders
    const idx = arr.findIndex((x) => x.id === order.id)
    if (idx >= 0) arr[idx] = { ...arr[idx], ...order }
    else arr.unshift(order)
    db.save()
    return { ok: true }
  },
  async getProductOrders(deviceId) {
    const d = db.get()
    if (!d.users[deviceId]) return []
    return clone(d.users[deviceId].productOrders || [])
  },
  async saveProductOrder(deviceId, order) {
    const d = db.get()
    if (!d.users[deviceId]) d.users[deviceId] = emptyUserDoc()
    const arr = d.users[deviceId].productOrders
    const idx = arr.findIndex((x) => x.id === order.id)
    if (idx >= 0) arr[idx] = { ...arr[idx], ...order }
    else arr.unshift(order)
    db.save()
    return { ok: true }
  },
  async listAllOrders(type) {
    const key = type === 'product' ? 'productOrders' : 'bookingOrders'
    const list = []
    for (const [deviceId, doc] of Object.entries(db.get().users)) {
      for (const o of doc[key] || []) list.push({ ...o, deviceId })
    }
    list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    return list
  },
  // ---------- 门店管理（JSON 驱动：内存结构对齐 MySQL 表） ----------
  _storesData() {
    const d = db.get()
    if (!d._stores) d._stores = { list: {}, extensions: {}, services: {}, logs: [] }
    return d._stores
  },
  async getStores() {
    return clone(Object.values(this._storesData().list).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)))
  },
  async getStore(id) {
    const s = this._storesData().list[id]
    return s ? clone(s) : null
  },
  async createStore(store) {
    const sd = this._storesData()
    if (sd.list[store.id]) return fail(400, `门店 ${store.id} 已存在`)
    const record = { ...store, sortOrder: store.sortOrder || 0, status: store.status || 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    sd.list[store.id] = record
    db.save()
    return { ok: true }
  },
  async updateStore(id, patch) {
    const sd = this._storesData()
    if (!sd.list[id]) return fail(404, '门店不存在')
    sd.list[id] = { ...sd.list[id], ...patch, id, updatedAt: new Date().toISOString() }
    db.save()
    return { ok: true }
  },
  async deleteStore(id) {
    const sd = this._storesData()
    if (!sd.list[id]) return fail(404, '门店不存在')
    delete sd.list[id]
    delete sd.extensions[id]
    delete sd.services[id]
    db.save()
    return { ok: true }
  },
  async getStoreExtension(storeId) {
    const e = this._storesData().extensions[storeId]
    return e ? clone(e) : null
  },
  async saveStoreExtension(storeId, ext) {
    this._storesData().extensions[storeId] = { ...ext, storeId, updatedAt: new Date().toISOString() }
    db.save()
    return { ok: true }
  },
  async getStoreServices(storeId) {
    return clone(this._storesData().services[storeId] || [])
  },
  async saveStoreService(storeId, serviceId, data) {
    const sd = this._storesData()
    if (!sd.services[storeId]) sd.services[storeId] = []
    const arr = sd.services[storeId]
    const idx = arr.findIndex((x) => x.serviceId === serviceId)
    if (idx >= 0) arr[idx] = { ...arr[idx], ...data, serviceId }
    else arr.push({ storeId, serviceId, ...data })
    db.save()
    return { ok: true }
  },
  async deleteStoreService(storeId, serviceId) {
    const sd = this._storesData()
    if (!sd.services[storeId]) return fail(404, '关联不存在')
    sd.services[storeId] = sd.services[storeId].filter((x) => x.serviceId !== serviceId)
    db.save()
    return { ok: true }
  },
  async logStoreChange(storeId, action, operator, detail) {
    const sd = this._storesData()
    sd.logs.push({ storeId, action, operator: operator || '', detail, createdAt: new Date().toISOString() })
    db.save()
    return { ok: true }
  },
  async getStoreLogs(storeId) {
    return clone((this._storesData().logs.filter((l) => l.storeId === storeId || !storeId) || []).slice().reverse())
  },
  // 一致性校验：检查门店基础信息与扩展信息是否完整
  async verifyStoreConsistency() {
    const sd = this._storesData()
    const issues = []
    for (const [id, s] of Object.entries(sd.list)) {
      if (!s.name) issues.push({ storeId: id, type: 'missing_name', msg: '门店名称缺失' })
      if (!sd.extensions[id]) issues.push({ storeId: id, type: 'missing_extension', msg: '扩展信息缺失' })
    }
    return { ok: true, issues, total: Object.keys(sd.list).length }
  },
  async saveMedia(id, entityType, entityId, filename, mime, size, filePath) {
    // 文件已由调用方落盘到 MEDIA_DIR，此处仅记录元数据
    const d = db.get()
    if (!d._media) d._media = {}
    d._media[id] = { entityType, entityId, filename, mime, size, filePath }
    db.save()
    return { ok: true, id }
  },
  async getMedia(id) {
    const d = db.get()
    const meta = d._media && d._media[id]
    if (!meta) return null
    return { mime: meta.mime, filePath: meta.filePath, filename: meta.filename }
  },
  async deleteMedia(id) {
    const fs = require('fs')
    const d = db.get()
    const meta = d._media && d._media[id]
    if (meta && fs.existsSync(meta.filePath)) {
      try { fs.unlinkSync(meta.filePath) } catch {}
    }
    if (d._media) delete d._media[id]
    db.save()
    return { ok: true }
  }
}

// ---------- MySQL 驱动 ----------
const SCHEMA = `
CREATE TABLE IF NOT EXISTS catalog_entities (
  type VARCHAR(32) NOT NULL,
  id VARCHAR(64) NOT NULL,
  data JSON NOT NULL,
  PRIMARY KEY (type, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS catalog_config (
  name VARCHAR(64) NOT NULL PRIMARY KEY,
  data JSON NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS users (
  device_id VARCHAR(64) NOT NULL PRIMARY KEY,
  data JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS media (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  entity_type VARCHAR(32) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  mime VARCHAR(128) NOT NULL,
  size BIGINT NOT NULL,
  file_path VARCHAR(512) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS booking_orders (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  device_id VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  data JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_device (device_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS product_orders (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  device_id VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  data JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_device (device_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS stores (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  address VARCHAR(255) DEFAULT '',
  phone VARCHAR(32) DEFAULT '',
  business_hours VARCHAR(64) DEFAULT '',
  cover VARCHAR(512) DEFAULT '',
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS store_extensions (
  store_id VARCHAR(64) NOT NULL PRIMARY KEY,
  description TEXT,
  latitude DECIMAL(10,7) DEFAULT NULL,
  longitude DECIMAL(10,7) DEFAULT NULL,
  manager_name VARCHAR(64) DEFAULT '',
  manager_phone VARCHAR(32) DEFAULT '',
  area DECIMAL(10,2) DEFAULT NULL,
  facilities JSON DEFAULT NULL,
  images JSON DEFAULT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS store_service (
  id INT AUTO_INCREMENT PRIMARY KEY,
  store_id VARCHAR(64) NOT NULL,
  service_id VARCHAR(64) NOT NULL,
  price DECIMAL(10,2) DEFAULT NULL,
  available TINYINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_store_service (store_id, service_id),
  INDEX idx_store (store_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS store_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  store_id VARCHAR(64) NOT NULL,
  action VARCHAR(16) NOT NULL,
  operator VARCHAR(64) DEFAULT '',
  detail JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_store (store_id),
  INDEX idx_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`

// 媒体文件落盘目录（服务器磁盘，MySQL 仅存路径）
const MEDIA_DIR = path.join(__dirname, 'uploads', 'media')

const mysqlDriver = {
  async init() {
    const mysql = require('mysql2/promise')
    pool = mysql.createPool({
      host: MYSQL_HOST,
      port: MYSQL_PORT,
      user: MYSQL_USER,
      password: MYSQL_PASS,
      database: MYSQL_DB,
      waitForConnections: true,
      connectionLimit: 5,
      connectTimeout: 8000,
      charset: 'utf8mb4'
    })
    await pool.query('SELECT 1')
    for (const stmt of SCHEMA.split(';').map((s) => s.trim()).filter(Boolean)) {
      await pool.query(stmt)
    }
    await this._seedOrMigrate()
    // 门店数据迁移：将 catalog_entities 中旧的 stores 搬到独立 stores 表
    await this._migrateStoresFromCatalog()
  },

  // 将 catalog_entities 中残留的门店数据迁移到独立 stores 表（幂等）
  async _migrateStoresFromCatalog() {
    const [rows] = await pool.query("SELECT id, data FROM catalog_entities WHERE type = 'stores'")
    if (!rows.length) return
    let migrated = 0
    for (const r of rows) {
      const s = typeof r.data === 'string' ? JSON.parse(r.data) : r.data
      const [exist] = await pool.query('SELECT id FROM stores WHERE id = ?', [r.id])
      if (!exist.length) {
        await pool.query(
          'INSERT INTO stores (id, name, address, phone, business_hours, cover, status, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [s.id, s.name || '', s.address || '', s.phone || '', s.businessHours || '', s.cover || '', s.status || 'active', s.sortOrder || 0]
        )
        migrated++
      }
    }
    if (migrated > 0) {
      // 迁移完成后删除 catalog_entities 中的旧门店记录
      await pool.query("DELETE FROM catalog_entities WHERE type = 'stores'")
      console.log(`[store] 已迁移 ${migrated} 条门店数据到独立 stores 表`)
    }
  },

  async _seedOrMigrate() {
    const [[{ cnt }]] = await pool.query('SELECT COUNT(*) AS cnt FROM catalog_entities')
    const [[{ ucnt }]] = await pool.query('SELECT COUNT(*) AS cnt FROM users')
    if (cnt > 0 || ucnt > 0) return
    // 空库：优先从本地 db.json 迁移，否则播种内置数据
    const fs = require('fs')
    if (fs.existsSync(db.DB_FILE)) {
      try {
        const d = JSON.parse(fs.readFileSync(db.DB_FILE, 'utf8'))
        const c = d.catalog || {}
        for (const type of ENTITY_TYPES) {
          for (const e of c[type] || []) {
            await pool.query('INSERT INTO catalog_entities (type, id, data) VALUES (?, ?, ?)', [type, e.id, JSON.stringify(e)])
          }
        }
        await pool.query('INSERT INTO catalog_config (name, data) VALUES (?, ?)', ['timeSlots', JSON.stringify(c.timeSlots || [])])
        await pool.query('INSERT INTO catalog_config (name, data) VALUES (?, ?)', ['hotDiseases', JSON.stringify(c.hotDiseases || [])])
        for (const kind of ['service', 'product', 'disease']) {
          await pool.query('INSERT INTO catalog_config (name, data) VALUES (?, ?)', [
            `categories:${kind}`,
            JSON.stringify((c.categories || {})[kind] || [{ id: 'all', name: '全部' }])
          ])
        }
        for (const [deviceId, doc] of Object.entries(d.users || {})) {
          await pool.query('INSERT INTO users (device_id, data) VALUES (?, ?)', [deviceId, JSON.stringify(doc)])
        }
        console.log(`[store] 已从 db.json 迁移数据到 MySQL（用户 ${Object.keys(d.users || {}).length} 个）`)
        return
      } catch (e) {
        console.error('[store] db.json 迁移失败，改为播种内置数据:', e.message)
      }
    }
    const seed = buildSeed()
    for (const type of ENTITY_TYPES) {
      for (const e of seed[type] || []) {
        await pool.query('INSERT INTO catalog_entities (type, id, data) VALUES (?, ?, ?)', [type, e.id, JSON.stringify(e)])
      }
    }
    await pool.query('INSERT INTO catalog_config (name, data) VALUES (?, ?)', ['timeSlots', JSON.stringify(seed.timeSlots || [])])
    await pool.query('INSERT INTO catalog_config (name, data) VALUES (?, ?)', ['hotDiseases', JSON.stringify(seed.hotDiseases || [])])
    for (const kind of ['service', 'product', 'disease']) {
      await pool.query('INSERT INTO catalog_config (name, data) VALUES (?, ?)', [
        `categories:${kind}`,
        JSON.stringify(seed.categories[kind] || [{ id: 'all', name: '全部' }])
      ])
    }
    console.log('[store] MySQL 空库，已播种内置数据')
  },

  async _getConfig(name) {
    const [rows] = await pool.query('SELECT data FROM catalog_config WHERE name = ?', [name])
    return rows.length ? JSON.parse(JSON.stringify(rows[0].data)) : null
  },

  async getCatalog() {
    const catalog = emptyCatalog()
    const [rows] = await pool.query('SELECT type, data FROM catalog_entities')
    for (const r of rows) {
      if (catalog[r.type]) catalog[r.type].push(typeof r.data === 'string' ? JSON.parse(r.data) : r.data)
    }
    // 门店数据从独立 stores 表读取（旧 catalog_entities 中的 stores 已迁移）
    catalog.stores = await this.getStores()
    const ts = await this._getConfig('timeSlots')
    if (ts) catalog.timeSlots = ts
    const hd = await this._getConfig('hotDiseases')
    if (hd) catalog.hotDiseases = hd
    for (const kind of ['service', 'product', 'disease']) {
      const arr = await this._getConfig(`categories:${kind}`)
      if (arr) catalog.categories[kind] = arr
    }
    return catalog
  },
  async getCollection(type) {
    const [rows] = await pool.query('SELECT data FROM catalog_entities WHERE type = ? ORDER BY id', [type])
    return rows.map((r) => (typeof r.data === 'string' ? JSON.parse(r.data) : r.data))
  },
  async createEntity(type, entity) {
    const [rows] = await pool.query('SELECT id FROM catalog_entities WHERE type = ? AND id = ?', [type, entity.id])
    if (rows.length) return fail(400, `id ${entity.id} 已存在`)
    await pool.query('INSERT INTO catalog_entities (type, id, data) VALUES (?, ?, ?)', [type, entity.id, JSON.stringify(entity)])
    return { ok: true }
  },
  async updateEntity(type, id, patch) {
    const [rows] = await pool.query('SELECT data FROM catalog_entities WHERE type = ? AND id = ?', [type, id])
    if (!rows.length) return fail(404, '记录不存在')
    const merged = { ...(typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data), ...patch, id }
    await pool.query('UPDATE catalog_entities SET data = ? WHERE type = ? AND id = ?', [JSON.stringify(merged), type, id])
    return { ok: true }
  },
  async deleteEntity(type, id) {
    const [r] = await pool.query('DELETE FROM catalog_entities WHERE type = ? AND id = ?', [type, id])
    if (!r.affectedRows) return fail(404, '记录不存在')
    return { ok: true }
  },
  async saveConfig(name, arr) {
    await pool.query('INSERT INTO catalog_config (name, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = ?', [
      name,
      JSON.stringify(arr),
      JSON.stringify(arr)
    ])
    return { ok: true }
  },
  async getUserDoc(deviceId) {
    const [rows] = await pool.query('SELECT data FROM users WHERE device_id = ?', [deviceId])
    let doc
    if (!rows.length) {
      doc = emptyUserDoc()
    } else {
      const d = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data
      doc = { ...emptyUserDoc(), ...d }
      // 旧数据迁移：把 users.data 中残留的订单搬到独立表
      await this._migrateOrdersFromUserDoc(deviceId, doc)
    }
    // 从独立订单表读取（订单数据的唯一可信源）
    doc.bookingOrders = await this.getBookingOrders(deviceId)
    doc.productOrders = await this.getProductOrders(deviceId)
    return doc
  },
  // 将 users.data 中残留的旧订单迁移到独立表（幂等：已存在同 id 则跳过）
  async _migrateOrdersFromUserDoc(deviceId, doc) {
    let changed = false
    for (const o of doc.bookingOrders || []) {
      const [exist] = await pool.query('SELECT id FROM booking_orders WHERE id = ?', [o.id])
      if (!exist.length) {
        await pool.query(
          'INSERT INTO booking_orders (id, device_id, status, data) VALUES (?, ?, ?, ?)',
          [o.id, deviceId, o.status || 'pending', JSON.stringify(o)]
        )
      }
      changed = true
    }
    for (const o of doc.productOrders || []) {
      const [exist] = await pool.query('SELECT id FROM product_orders WHERE id = ?', [o.id])
      if (!exist.length) {
        await pool.query(
          'INSERT INTO product_orders (id, device_id, status, data) VALUES (?, ?, ?, ?)',
          [o.id, deviceId, o.status || 'pending', JSON.stringify(o)]
        )
      }
      changed = true
    }
    if (changed) {
      // 清空 users.data 中的订单数组，避免重复
      const clean = { ...doc, bookingOrders: [], productOrders: [] }
      await pool.query('UPDATE users SET data = ? WHERE device_id = ?', [JSON.stringify(clean), deviceId])
    }
  },
  async saveUserDoc(deviceId, doc) {
    await pool.query('INSERT INTO users (device_id, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = ?', [
      deviceId,
      JSON.stringify(doc),
      JSON.stringify(doc)
    ])
    return { ok: true }
  },
  async listUserDocs() {
    const [rows] = await pool.query('SELECT device_id, data FROM users ORDER BY updated_at DESC')
    return rows.map((r) => ({
      deviceId: r.device_id,
      doc: { ...emptyUserDoc(), ...(typeof r.data === 'string' ? JSON.parse(r.data) : r.data) }
    }))
  },
  // ---- 订单（独立表管理，状态实时推送落库） ----
  async getBookingOrders(deviceId) {
    const [rows] = await pool.query(
      'SELECT data FROM booking_orders WHERE device_id = ? ORDER BY created_at DESC',
      [deviceId]
    )
    return rows.map((r) => (typeof r.data === 'string' ? JSON.parse(r.data) : r.data))
  },
  async saveBookingOrder(deviceId, order) {
    const status = order.status || 'pending'
    await pool.query(
      'INSERT INTO booking_orders (id, device_id, status, data) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE status=VALUES(status), data=VALUES(data)',
      [order.id, deviceId, status, JSON.stringify(order)]
    )
    return { ok: true }
  },
  async getProductOrders(deviceId) {
    const [rows] = await pool.query(
      'SELECT data FROM product_orders WHERE device_id = ? ORDER BY created_at DESC',
      [deviceId]
    )
    return rows.map((r) => (typeof r.data === 'string' ? JSON.parse(r.data) : r.data))
  },
  async saveProductOrder(deviceId, order) {
    const status = order.status || 'pending'
    await pool.query(
      'INSERT INTO product_orders (id, device_id, status, data) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE status=VALUES(status), data=VALUES(data)',
      [order.id, deviceId, status, JSON.stringify(order)]
    )
    return { ok: true }
  },
  // 管理后台：跨用户拉取所有订单
  async listAllOrders(type) {
    const table = type === 'product' ? 'product_orders' : 'booking_orders'
    const [rows] = await pool.query(
      `SELECT device_id, data FROM ${table} ORDER BY created_at DESC`
    )
    return rows.map((r) => ({
      ...(typeof r.data === 'string' ? JSON.parse(r.data) : r.data),
      deviceId: r.device_id
    }))
  },
  // ---------- 门店管理（独立 MySQL 表） ----------
  async getStores() {
    const [rows] = await pool.query('SELECT * FROM stores ORDER BY sort_order ASC, created_at ASC')
    return rows.map((r) => this._rowToStore(r))
  },
  _rowToStore(r) {
    return {
      id: r.id,
      name: r.name,
      address: r.address || '',
      phone: r.phone || '',
      businessHours: r.business_hours || '',
      cover: r.cover || '',
      status: r.status || 'active',
      sortOrder: r.sort_order || 0,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }
  },
  async getStore(id) {
    const [rows] = await pool.query('SELECT * FROM stores WHERE id = ?', [id])
    if (!rows.length) return null
    return this._rowToStore(rows[0])
  },
  async createStore(store) {
    const [exist] = await pool.query('SELECT id FROM stores WHERE id = ?', [store.id])
    if (exist.length) return fail(400, `门店 ${store.id} 已存在`)
    await pool.query(
      'INSERT INTO stores (id, name, address, phone, business_hours, cover, status, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [store.id, store.name || '', store.address || '', store.phone || '', store.businessHours || '', store.cover || '', store.status || 'active', store.sortOrder || 0]
    )
    return { ok: true }
  },
  async updateStore(id, patch) {
    const [rows] = await pool.query('SELECT * FROM stores WHERE id = ?', [id])
    if (!rows.length) return fail(404, '门店不存在')
    const cur = rows[0]
    const name = patch.name !== undefined ? patch.name : cur.name
    const address = patch.address !== undefined ? patch.address : cur.address
    const phone = patch.phone !== undefined ? patch.phone : cur.phone
    const businessHours = patch.businessHours !== undefined ? patch.businessHours : cur.business_hours
    const cover = patch.cover !== undefined ? patch.cover : cur.cover
    const status = patch.status !== undefined ? patch.status : cur.status
    const sortOrder = patch.sortOrder !== undefined ? patch.sortOrder : cur.sort_order
    await pool.query(
      'UPDATE stores SET name=?, address=?, phone=?, business_hours=?, cover=?, status=?, sort_order=? WHERE id=?',
      [name, address, phone, businessHours, cover, status, sortOrder, id]
    )
    return { ok: true }
  },
  async deleteStore(id) {
    const [r] = await pool.query('DELETE FROM stores WHERE id = ?', [id])
    if (!r.affectedRows) return fail(404, '门店不存在')
    // 级联清理扩展信息、服务关联
    await pool.query('DELETE FROM store_extensions WHERE store_id = ?', [id])
    await pool.query('DELETE FROM store_service WHERE store_id = ?', [id])
    return { ok: true }
  },
  async getStoreExtension(storeId) {
    const [rows] = await pool.query('SELECT * FROM store_extensions WHERE store_id = ?', [storeId])
    if (!rows.length) return null
    const r = rows[0]
    return {
      storeId: r.store_id,
      description: r.description || '',
      latitude: r.latitude !== null ? Number(r.latitude) : null,
      longitude: r.longitude !== null ? Number(r.longitude) : null,
      managerName: r.manager_name || '',
      managerPhone: r.manager_phone || '',
      area: r.area !== null ? Number(r.area) : null,
      facilities: r.facilities ? (typeof r.facilities === 'string' ? JSON.parse(r.facilities) : r.facilities) : [],
      images: r.images ? (typeof r.images === 'string' ? JSON.parse(r.images) : r.images) : [],
      updatedAt: r.updated_at
    }
  },
  async saveStoreExtension(storeId, ext) {
    await pool.query(
      'INSERT INTO store_extensions (store_id, description, latitude, longitude, manager_name, manager_phone, area, facilities, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE description=VALUES(description), latitude=VALUES(latitude), longitude=VALUES(longitude), manager_name=VALUES(manager_name), manager_phone=VALUES(manager_phone), area=VALUES(area), facilities=VALUES(facilities), images=VALUES(images)',
      [storeId, ext.description || '', ext.latitude ?? null, ext.longitude ?? null, ext.managerName || '', ext.managerPhone || '', ext.area ?? null, JSON.stringify(ext.facilities || []), JSON.stringify(ext.images || [])]
    )
    return { ok: true }
  },
  async getStoreServices(storeId) {
    const [rows] = await pool.query('SELECT service_id, price, available FROM store_service WHERE store_id = ?', [storeId])
    return rows.map((r) => ({ storeId, serviceId: r.service_id, price: r.price !== null ? Number(r.price) : null, available: !!r.available }))
  },
  async saveStoreService(storeId, serviceId, data) {
    await pool.query(
      'INSERT INTO store_service (store_id, service_id, price, available) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE price=VALUES(price), available=VALUES(available)',
      [storeId, serviceId, data.price ?? null, data.available !== undefined ? (data.available ? 1 : 0) : 1]
    )
    return { ok: true }
  },
  async deleteStoreService(storeId, serviceId) {
    const [r] = await pool.query('DELETE FROM store_service WHERE store_id = ? AND service_id = ?', [storeId, serviceId])
    if (!r.affectedRows) return fail(404, '关联不存在')
    return { ok: true }
  },
  async logStoreChange(storeId, action, operator, detail) {
    await pool.query(
      'INSERT INTO store_logs (store_id, action, operator, detail) VALUES (?, ?, ?, ?)',
      [storeId, action, operator || '', detail ? JSON.stringify(detail) : null]
    )
    return { ok: true }
  },
  async getStoreLogs(storeId) {
    const sql = storeId
      ? 'SELECT store_id, action, operator, detail, created_at FROM store_logs WHERE store_id = ? ORDER BY created_at DESC'
      : 'SELECT store_id, action, operator, detail, created_at FROM store_logs ORDER BY created_at DESC LIMIT 200'
    const [rows] = storeId ? await pool.query(sql, [storeId]) : await pool.query(sql)
    return rows.map((r) => ({
      storeId: r.store_id,
      action: r.action,
      operator: r.operator,
      detail: r.detail ? (typeof r.detail === 'string' ? JSON.parse(r.detail) : r.detail) : null,
      createdAt: r.created_at
    }))
  },
  // 一致性校验：门店基础表与扩展表的完整性检查
  async verifyStoreConsistency() {
    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM stores')
    const [issues] = await pool.query(
      `SELECT s.id AS storeId,
        CASE WHEN s.name IS NULL OR s.name = '' THEN 'missing_name'
             WHEN e.store_id IS NULL THEN 'missing_extension'
        END AS type,
        CASE WHEN s.name IS NULL OR s.name = '' THEN '门店名称缺失'
             WHEN e.store_id IS NULL THEN '扩展信息缺失'
        END AS msg
      FROM stores s
      LEFT JOIN store_extensions e ON e.store_id = s.id
      WHERE s.name IS NULL OR s.name = '' OR e.store_id IS NULL`
    )
    return { ok: true, issues, total }
  },
  async saveMedia(id, entityType, entityId, filename, mime, size, filePath) {
    // 文件已由调用方落盘到 MEDIA_DIR，MySQL 仅存路径与关联关系
    await pool.query(
      'INSERT INTO media (id, entity_type, entity_id, filename, mime, size, file_path) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE filename=VALUES(filename), mime=VALUES(mime), size=VALUES(size), file_path=VALUES(file_path)',
      [id, entityType, entityId, filename, mime, size, filePath]
    )
    return { ok: true, id }
  },
  async getMedia(id) {
    const [rows] = await pool.query('SELECT mime, file_path, filename FROM media WHERE id = ?', [id])
    if (!rows.length) return null
    return { mime: rows[0].mime, filePath: rows[0].file_path, filename: rows[0].filename }
  },
  async deleteMedia(id) {
    // 先查路径删磁盘文件，再删库记录
    const [rows] = await pool.query('SELECT file_path FROM media WHERE id = ?', [id])
    if (rows.length && rows[0].file_path) {
      const fs = require('fs')
      try { if (fs.existsSync(rows[0].file_path)) fs.unlinkSync(rows[0].file_path) } catch {}
    }
    await pool.query('DELETE FROM media WHERE id = ?', [id])
    return { ok: true }
  }
}

// ---------- 门面 ----------
const store = {
  get driver() {
    return driver
  },

  // 实际存储状态（供 /api/health 与运维检查使用，防止配置错误静默回退）
  get storage() {
    return {
      driver, // 实际驱动: 'mysql' | 'json'
      wanted: wantMysql ? 'mysql' : 'json', // 配置期望的驱动
      fallback: wantMysql && driver === 'json', // 是否发生了 MySQL → JSON 回退
      detail: driver === 'mysql'
        ? `MySQL @ ${MYSQL_HOST}:${MYSQL_PORT}/${MYSQL_DB}`
        : `JSON 文件（${db.DB_FILE}）`
    }
  },

  async init() {
    if (wantMysql) {
      try {
        await mysqlDriver.init()
        driver = 'mysql'
      } catch (e) {
        console.error(`[store] MySQL 初始化失败（${e.message}），自动回退 JSON 文件存储`)
        driver = 'json'
      }
    }
    if (driver === 'mysql') {
      console.log(`[store] 存储驱动: MySQL @ ${MYSQL_HOST}:${MYSQL_PORT}/${MYSQL_DB}`)
    } else {
      await jsonDriver.init()
      console.log(`[store] 存储驱动: JSON 文件（${db.DB_FILE}）`)
    }
  },

  async getCatalog() {
    return driver === 'mysql' ? mysqlDriver.getCatalog() : jsonDriver.getCatalog()
  },
  async getCollection(type) {
    if (!ENTITY_TYPES.includes(type)) throw new Error(`未知集合: ${type}`)
    return driver === 'mysql' ? mysqlDriver.getCollection(type) : jsonDriver.getCollection(type)
  },
  async createEntity(type, entity) {
    return driver === 'mysql' ? mysqlDriver.createEntity(type, entity) : jsonDriver.createEntity(type, entity)
  },
  async updateEntity(type, id, patch) {
    return driver === 'mysql' ? mysqlDriver.updateEntity(type, id, patch) : jsonDriver.updateEntity(type, id, patch)
  },
  async deleteEntity(type, id) {
    return driver === 'mysql' ? mysqlDriver.deleteEntity(type, id) : jsonDriver.deleteEntity(type, id)
  },
  async saveConfig(name, arr) {
    if (!CONFIG_KEYS.includes(name)) throw new Error(`未知配置项: ${name}`)
    return driver === 'mysql' ? mysqlDriver.saveConfig(name, arr) : jsonDriver.saveConfig(name, arr)
  },
  async getUserDoc(deviceId) {
    return driver === 'mysql' ? mysqlDriver.getUserDoc(deviceId) : jsonDriver.getUserDoc(deviceId)
  },
  async saveUserDoc(deviceId, doc) {
    return driver === 'mysql' ? mysqlDriver.saveUserDoc(deviceId, doc) : jsonDriver.saveUserDoc(deviceId, doc)
  },
  async listUserDocs() {
    return driver === 'mysql' ? mysqlDriver.listUserDocs() : jsonDriver.listUserDocs()
  },
  // ---- 订单独立表 ----
  async getBookingOrders(deviceId) {
    return driver === 'mysql' ? mysqlDriver.getBookingOrders(deviceId) : jsonDriver.getBookingOrders(deviceId)
  },
  async saveBookingOrder(deviceId, order) {
    return driver === 'mysql' ? mysqlDriver.saveBookingOrder(deviceId, order) : jsonDriver.saveBookingOrder(deviceId, order)
  },
  async getProductOrders(deviceId) {
    return driver === 'mysql' ? mysqlDriver.getProductOrders(deviceId) : jsonDriver.getProductOrders(deviceId)
  },
  async saveProductOrder(deviceId, order) {
    return driver === 'mysql' ? mysqlDriver.saveProductOrder(deviceId, order) : jsonDriver.saveProductOrder(deviceId, order)
  },
  async listAllOrders(type) {
    return driver === 'mysql' ? mysqlDriver.listAllOrders(type) : jsonDriver.listAllOrders(type)
  },
  // ---------- 门店管理门面 ----------
  async getStores() {
    return driver === 'mysql' ? mysqlDriver.getStores() : jsonDriver.getStores()
  },
  async getStore(id) {
    return driver === 'mysql' ? mysqlDriver.getStore(id) : jsonDriver.getStore(id)
  },
  async createStore(store) {
    return driver === 'mysql' ? mysqlDriver.createStore(store) : jsonDriver.createStore(store)
  },
  async updateStore(id, patch) {
    return driver === 'mysql' ? mysqlDriver.updateStore(id, patch) : jsonDriver.updateStore(id, patch)
  },
  async deleteStore(id) {
    return driver === 'mysql' ? mysqlDriver.deleteStore(id) : jsonDriver.deleteStore(id)
  },
  async getStoreExtension(storeId) {
    return driver === 'mysql' ? mysqlDriver.getStoreExtension(storeId) : jsonDriver.getStoreExtension(storeId)
  },
  async saveStoreExtension(storeId, ext) {
    return driver === 'mysql' ? mysqlDriver.saveStoreExtension(storeId, ext) : jsonDriver.saveStoreExtension(storeId, ext)
  },
  async getStoreServices(storeId) {
    return driver === 'mysql' ? mysqlDriver.getStoreServices(storeId) : jsonDriver.getStoreServices(storeId)
  },
  async saveStoreService(storeId, serviceId, data) {
    return driver === 'mysql' ? mysqlDriver.saveStoreService(storeId, serviceId, data) : jsonDriver.saveStoreService(storeId, serviceId, data)
  },
  async deleteStoreService(storeId, serviceId) {
    return driver === 'mysql' ? mysqlDriver.deleteStoreService(storeId, serviceId) : jsonDriver.deleteStoreService(storeId, serviceId)
  },
  async logStoreChange(storeId, action, operator, detail) {
    return driver === 'mysql' ? mysqlDriver.logStoreChange(storeId, action, operator, detail) : jsonDriver.logStoreChange(storeId, action, operator, detail)
  },
  async getStoreLogs(storeId) {
    return driver === 'mysql' ? mysqlDriver.getStoreLogs(storeId) : jsonDriver.getStoreLogs(storeId)
  },
  async verifyStoreConsistency() {
    return driver === 'mysql' ? mysqlDriver.verifyStoreConsistency() : jsonDriver.verifyStoreConsistency()
  },
  async saveMedia(id, entityType, entityId, filename, mime, size, filePath) {
    return driver === 'mysql'
      ? mysqlDriver.saveMedia(id, entityType, entityId, filename, mime, size, filePath)
      : jsonDriver.saveMedia(id, entityType, entityId, filename, mime, size, filePath)
  },
  async getMedia(id) {
    return driver === 'mysql' ? mysqlDriver.getMedia(id) : jsonDriver.getMedia(id)
  },
  async deleteMedia(id) {
    return driver === 'mysql' ? mysqlDriver.deleteMedia(id) : jsonDriver.deleteMedia(id)
  }
}

module.exports = store
module.exports.ENTITY_TYPES = ENTITY_TYPES
module.exports.CONFIG_KEYS = CONFIG_KEYS
module.exports.MEDIA_DIR = MEDIA_DIR
module.exports.DB_INFO = { wantMysql, MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_DB, DB_FILE: db.DB_FILE }
