// ============================================
// 接口自动化验证脚本（对应 docs/API.md）
// 用法: node server/verify-api.mjs   （服务需已启动）
// 环境变量: BASE=http://localhost:3000
// ============================================
const BASE = process.env.BASE || 'http://localhost:3000'

const results = []
function record(name, pass, detail = '') {
  results.push({ name, pass, detail })
  console.log(`${pass ? '✅ PASS' : '❌ FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
}

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = 'Bearer ' + token
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined })
  let json = null
  try { json = await res.json() } catch { /* 非 JSON 响应 */ }
  return { status: res.status, json }
}

function assert(name, cond, detail = '') {
  record(name, !!cond, detail)
}

// ---------- 1. 小程序端接口 ----------
async function testPublic() {
  const h = await req('GET', '/api/health')
  assert('GET /api/health', h.status === 200 && h.json.code === 0 && h.json.data.ok === true)

  const c = await req('GET', '/api/catalog')
  const d = c.json?.data || {}
  const ok =
    c.status === 200 && c.json.code === 0 &&
    d.services?.length > 0 && d.stores?.length > 0 && d.timeSlots?.length > 0 &&
    d.products?.length > 0 && d.diseases?.length > 0 && d.acupoints?.length > 0 &&
    d.categories?.service?.length > 0
  assert('GET /api/catalog', ok, `services=${d.services?.length} stores=${d.stores?.length} products=${d.products?.length} diseases=${d.diseases?.length} acupoints=${d.acupoints?.length}`)

  const DEV = 'verify-docs-001'

  // 用户资料
  const p = await req('PUT', `/api/user/${DEV}/profile`, { name: '接口验证用户', gender: 'male', age: 33, allergy: '花粉' })
  assert('PUT /api/user/:id/profile', p.status === 200 && p.json.code === 0 && p.json.data.name === '接口验证用户' && !!p.json.data.updatedAt)

  // 预约订单：创建 / 修改 / 查询
  const bo = {
    id: 'bo_verify_1', serviceId: 's001', serviceName: '背部循经刮痧', serviceCover: 'https://picsum.photos/id/128/750/500',
    storeId: 'st001', storeName: '颐养堂·城西旗舰店', storeAddress: '杭州市西湖区文三路 100 号',
    date: '2026-09-03', time: '10:00-11:00', customerName: '验证客户', customerPhone: '13800000001',
    remark: '接口验证', price: 168, status: 'pending', createdAt: new Date().toISOString()
  }
  const b1 = await req('POST', `/api/user/${DEV}/booking-orders`, bo)
  assert('POST /api/user/:id/booking-orders', b1.status === 200 && b1.json.code === 0)
  const b2 = await req('PATCH', `/api/user/${DEV}/booking-orders/bo_verify_1`, { status: 'confirmed' })
  let u = await req('GET', `/api/user/${DEV}`)
  assert('PATCH /api/user/:id/booking-orders/:oid', b2.status === 200 && u.json.data.bookingOrders[0]?.status === 'confirmed')

  // 商品订单：创建 / 修改 / 查询
  const po = {
    id: 'po_verify_1', createdAt: new Date().toISOString(),
    items: [{ productId: 'p001', productName: '艾草足浴包', productCover: 'https://picsum.photos/id/292/400/400', specId: 'p001_30', specName: '30 包/盒', price: 39.9, quantity: 2 }],
    totalAmount: 79.8, receiver: '验证收货人', phone: '13900000002', address: '杭州市西湖区测试路 1 号', remark: '', status: 'paid'
  }
  const o1 = await req('POST', `/api/user/${DEV}/product-orders`, po)
  const o2 = await req('PATCH', `/api/user/${DEV}/product-orders/po_verify_1`, { status: 'shipped' })
  u = await req('GET', `/api/user/${DEV}`)
  assert('POST+PATCH product-orders', o1.status === 200 && o2.status === 200 && u.json.data.productOrders[0]?.status === 'shipped')

  // 体质报告
  const cr = { id: 'cr_verify_1', date: new Date().toISOString(), primary: '平和质', secondary: '气虚质', scores: { pinghe: 80, qixu: 45, yangxu: 30, yinxu: 35, tanshi: 25, shire: 28, xueyu: 22, qiyu: 30, tebing: 15 }, infos: [] }
  const r1 = await req('POST', `/api/user/${DEV}/constitution-results`, cr)
  u = await req('GET', `/api/user/${DEV}`)
  assert('POST constitution-results', r1.status === 200 && u.json.data.constitutionResults[0]?.primary === '平和质')

  // 健康档案：新增 / 删除
  const hr = { id: 'hr_verify_1', date: new Date().toISOString(), type: 'condition', title: '睡眠质量评估', content: '入睡困难，多梦易醒', details: {} }
  const h1 = await req('POST', `/api/user/${DEV}/health-records`, hr)
  const h2 = await req('DELETE', `/api/user/${DEV}/health-records/hr_verify_1`)
  u = await req('GET', `/api/user/${DEV}`)
  assert('POST+DELETE health-records', h1.status === 200 && h2.status === 200 && u.json.data.healthRecords.length === 0)

  assert('GET /api/user/:id 汇总', !!u.json.data.profile &&
    u.json.data.bookingOrders.filter((o) => o.id === 'bo_verify_1').length === 1 &&
    u.json.data.productOrders.filter((o) => o.id === 'po_verify_1').length === 1 &&
    u.json.data.constitutionResults.filter((r) => r.id === 'cr_verify_1').length === 1)
}

// ---------- 2. 后台管理接口 ----------
async function testAdmin() {
  // 未授权访问
  const no = await req('GET', '/api/admin/overview')
  assert('未携带 token 返回 401', no.status === 401)

  // 登录：错误密码 / 正确密码
  const bad = await req('POST', '/api/admin/login', { username: 'admin', password: 'wrong' })
  assert('登录-错误密码 401', bad.status === 401)
  const login = await req('POST', '/api/admin/login', { username: 'admin', password: 'admin123' })
  const token = login.json?.data?.token
  assert('POST /api/admin/login', login.status === 200 && login.json.code === 0 && !!token)
  if (!token) return

  const T = token
  const ov = await req('GET', '/api/admin/overview', null, T)
  assert('GET /api/admin/overview', ov.status === 200 && ov.json.data.userCount >= 1 && ov.json.data.bookingOrders >= 1)

  const us = await req('GET', '/api/admin/users', null, T)
  assert('GET /api/admin/users', us.status === 200 && us.json.data.some((x) => x.deviceId === 'verify-docs-001'))

  const ud = await req('GET', '/api/admin/user/verify-docs-001', null, T)
  assert('GET /api/admin/user/:id', ud.status === 200 && ud.json.data.bookingOrders.length === 1 && ud.json.data.profile.name === '接口验证用户')

  const ob = await req('GET', '/api/admin/orders?type=booking', null, T)
  const op = await req('GET', '/api/admin/orders?type=product', null, T)
  assert('GET /api/admin/orders?type=*', ob.json.data.some((o) => o.id === 'bo_verify_1') && op.json.data.some((o) => o.id === 'po_verify_1'))

  const ao = await req('PATCH', '/api/admin/order/verify-docs-001/booking/bo_verify_1', { status: 'completed' }, T)
  const uAfter = await req('GET', '/api/user/verify-docs-001')
  assert('PATCH /api/admin/order/:did/:type/:oid', ao.status === 200 && uAfter.json.data.bookingOrders[0]?.status === 'completed')

  // 目录 CRUD
  const sv = { id: 's_verify', name: '验证用服务(临时)', category: 'sc004', cover: 'https://picsum.photos/id/431/750/500', price: 99, originalPrice: 128, duration: 45, intro: '接口验证用', efficacy: ['验证'], suitable: ['验证用户'], caution: ['临时数据'], steps: [{ title: '一', desc: '验证' }], popular: false }
  const c1 = await req('POST', '/api/admin/catalog/services', sv, T)
  assert('POST /api/admin/catalog/services', c1.status === 200 && c1.json.code === 0)
  const dup = await req('POST', '/api/admin/catalog/services', sv, T)
  assert('重复 id 返回 400', dup.status === 400)
  const noid = await req('POST', '/api/admin/catalog/services', { name: '无id' }, T)
  assert('缺少 id 返回 400', noid.status === 400)
  const c2 = await req('PUT', '/api/admin/catalog/services/s_verify', { name: '验证用服务(已改)', price: 88 }, T)
  const c3 = await req('GET', '/api/admin/catalog/services', null, T)
  const edited = c3.json.data.find((x) => x.id === 's_verify')
  assert('PUT /api/admin/catalog/services/:id', c2.status === 200 && edited?.name === '验证用服务(已改)' && edited?.price === 88 && edited?.duration === 45)
  const c4 = await req('DELETE', '/api/admin/catalog/services/s_verify', null, T)
  const c5 = await req('GET', '/api/admin/catalog/services', null, T)
  assert('DELETE /api/admin/catalog/services/:id', c4.status === 200 && !c5.json.data.some((x) => x.id === 's_verify'))

  // 基础配置（改完还原）
  const cat = await req('GET', '/api/catalog')
  const orig = cat.json.data
  const ts1 = await req('PUT', '/api/admin/catalog/timeSlots', { items: ['08:00-09:00', '19:00-20:00'] }, T)
  const tsCheck = await req('GET', '/api/catalog')
  const ts2 = await req('PUT', '/api/admin/catalog/timeSlots', { items: orig.timeSlots }, T)
  assert('PUT timeSlots（改+还原）', ts1.status === 200 && ts2.status === 200 && tsCheck.json.data.timeSlots.includes('08:00-09:00') && ts2.json.code === 0)

  const hd1 = await req('PUT', '/api/admin/catalog/hotDiseases', { items: ['验证1', '验证2'] }, T)
  const hd2 = await req('PUT', '/api/admin/catalog/hotDiseases', { items: orig.hotDiseases }, T)
  assert('PUT hotDiseases（改+还原）', hd1.status === 200 && hd2.status === 200)

  const cg1 = await req('PUT', '/api/admin/catalog/categories', { kind: 'service', items: [{ id: 'all', name: '全部' }, { id: 'sc_verify', name: '验证分类' }] }, T)
  const cg2 = await req('PUT', '/api/admin/catalog/categories', { kind: 'service', items: orig.categories.service }, T)
  const cgBad = await req('PUT', '/api/admin/catalog/categories', { kind: 'xxx', items: [] }, T)
  assert('PUT categories（改+还原+非法kind）', cg1.status === 200 && cg2.status === 200 && cgBad.status === 400)

  // 404
  const nf = await req('GET', '/api/not-exist', null, T)
  assert('未知接口返回 404', nf.status === 404)
}

// ---------- 执行 ----------
console.log(`\n接口验证开始 → ${BASE}\n`)
try {
  await testPublic()
  await testAdmin()
} catch (e) {
  record('执行中断', false, e.message)
}
const pass = results.filter((r) => r.pass).length
const fail = results.length - pass
console.log(`\n========== 结果: ${pass} 通过 / ${fail} 失败 (共 ${results.length} 项) ==========`)
process.exit(fail > 0 ? 1 : 0)
