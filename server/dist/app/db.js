// ============================================
// 零依赖 JSON 文件数据库
// 数据文件: <DATA_DIR>/db.json（DATA_DIR 可用环境变量配置，默认 server/data）
// ============================================
const fs = require('fs')
const path = require('path')

// 数据目录：支持绝对路径或相对项目根目录的路径
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.cwd(), process.env.DATA_DIR) : path.join(__dirname, 'data')
const DB_FILE = path.join(DATA_DIR, 'db.json')

let db = null

function createEmpty() {
  return {
    catalog: {
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
    },
    users: {}
  }
}

function load() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (fs.existsSync(DB_FILE)) {
    try {
      db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
    } catch (e) {
      console.error('[db] db.json 解析失败，重建空库:', e.message)
      db = createEmpty()
      save()
    }
  } else {
    db = createEmpty()
  }
  return db
}

// 原子写入（先写临时文件再替换，避免写一半损坏）
function save() {
  const tmp = DB_FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8')
  fs.renameSync(tmp, DB_FILE)
}

function get() {
  if (!db) load()
  return db
}

// 获取（或创建）用户数据分区
function getUser(deviceId) {
  const d = get()
  if (!d.users[deviceId]) {
    d.users[deviceId] = {
      profile: null,
      bookingOrders: [],
      productOrders: [],
      constitutionResults: [],
      healthRecords: []
    }
  }
  return d.users[deviceId]
}

module.exports = { get, save, load, createEmpty, getUser, DB_FILE }
