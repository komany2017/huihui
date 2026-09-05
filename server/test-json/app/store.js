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
    return clone(db.get().catalog)
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`

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
    if (!rows.length) return emptyUserDoc()
    const d = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data
    return { ...emptyUserDoc(), ...d }
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
  }
}

module.exports = store
module.exports.ENTITY_TYPES = ENTITY_TYPES
module.exports.CONFIG_KEYS = CONFIG_KEYS
module.exports.DB_INFO = { wantMysql, MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_DB, DB_FILE: db.DB_FILE }
