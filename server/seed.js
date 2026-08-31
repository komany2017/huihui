// ============================================
// 种子数据：从小程序静态数据(src/data/*.ts)构建初始目录
// 纯文本转换：剥离 import type / 函数定义 / 类型注解，再 eval 提取常量
// buildSeed() 为纯函数，不写库；由 store.js 在空库时调用
// ============================================
const fs = require('fs')
const path = require('path')

// 数据源目录：本地开发读项目 src/data；服务器部署读随包携带的 src-data
const SRC_DIR_CANDIDATES = [
  path.join(__dirname, '..', 'src', 'data'),
  path.join(__dirname, 'src-data')
]
const SRC_DIR = SRC_DIR_CANDIDATES.find((p) => fs.existsSync(path.join(p, 'services.ts'))) || SRC_DIR_CANDIDATES[0]

// 剥离 export function 定义（按大括号配平逐行跳过）
function stripFunctions(text) {
  const lines = text.split('\n')
  const out = []
  let skipping = false
  let depth = 0
  for (const line of lines) {
    if (!skipping && /^\s*export function/.test(line)) {
      skipping = true
      depth = 0
    }
    if (skipping) {
      depth += (line.match(/{/g) || []).length
      depth -= (line.match(/}/g) || []).length
      if (depth <= 0 && /}/.test(line)) skipping = false
      continue
    }
    out.push(line)
  }
  return out.join('\n')
}

// TS 文本 -> 常量集合对象
function extract(file) {
  let text = fs.readFileSync(path.join(SRC_DIR, file), 'utf8')
  text = text
    .split('\n')
    .filter((l) => !l.trim().startsWith('import type'))
    .join('\n')
  text = stripFunctions(text)
  text = text.replace(/export (?:const|let) (\w+)\s*:[^=]*=/g, '__E.$1 =')
  text = text.replace(/export (?:const|let) (\w+)\s*=/g, '__E.$1 =')
  const code = 'const __E = {};' + text + '; return __E;'
  let result
  try {
    result = new Function(code)()
  } catch (e) {
    throw new Error(`[${file}] 转换执行失败: ${e.message}`)
  }
  if (!result || typeof result !== 'object') {
    throw new Error(`[${file}] 转换结果为空`)
  }
  return result
}

function buildSeed() {
  const svc = extract('services.ts')
  const prod = extract('products.ts')
  const dis = extract('diseases.ts')
  const acu = extract('acupoints.ts')

  return {
    services: svc.SERVICES || [],
    stores: svc.STORES || [],
    timeSlots: svc.BOOKING_TIME_SLOTS || [],
    products: prod.PRODUCTS || [],
    diseases: dis.DISEASES || [],
    acupoints: acu.ACUPOINTS || [],
    categories: {
      service: svc.SERVICE_CATEGORIES || [{ id: 'all', name: '全部' }],
      product: prod.PRODUCT_CATEGORIES || [{ id: 'all', name: '全部' }],
      disease: dis.DISEASE_CATEGORIES || [{ id: 'all', name: '全部' }]
    },
    hotDiseases: dis.HOT_DISEASES || []
  }
}

module.exports = { buildSeed }
