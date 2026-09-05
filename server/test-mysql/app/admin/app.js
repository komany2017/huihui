// ============================================
// 润泉养元后台管理 - 前端逻辑（零依赖原生 JS）
// ============================================
const API = location.origin
const $ = (s) => document.querySelector(s)

let token = localStorage.getItem('yyt_admin_token') || ''
let currentTab = 'overview'
let catalogCache = null

// ---------- 基础 ----------
async function api(path, method = 'GET', body) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: body ? JSON.stringify(body) : undefined
  })
  const json = await res.json().catch(() => ({}))
  if (res.status === 401) { logout(); throw new Error(json.msg || '登录已过期') }
  if (!res.ok || json.code !== 0) throw new Error(json.msg || `请求失败(${res.status})`)
  return json.data
}

function toast(msg) {
  const t = $('#toast')
  t.textContent = msg
  t.classList.remove('hidden')
  clearTimeout(t._timer)
  t._timer = setTimeout(() => t.classList.add('hidden'), 2200)
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

const STATUS_MAP = {
  pending: ['待确认', 'pending'], confirmed: ['已确认', 'confirmed'], completed: ['已完成', 'completed'], cancelled: ['已取消', 'cancelled'],
  unpaid: ['待付款', 'refunded'], paid: ['已付款', 'paid'], shipped: ['已发货', 'shipped'], refunded: ['已退款', 'refunded']
}
function statusTag(s) {
  const m = STATUS_MAP[s] || [s || '-', 'refunded']
  return `<span class="tag ${m[1]}">${esc(m[0])}</span>`
}

// ---------- 登录 ----------
async function login() {
  $('#loginErr').textContent = ''
  try {
    const d = await fetch(API + '/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: $('#loginUser').value.trim(), password: $('#loginPass').value })
    }).then((r) => r.json())
    if (d.code !== 0) throw new Error(d.msg || '登录失败')
    token = d.data.token
    localStorage.setItem('yyt_admin_token', token)
    enterMain()
  } catch (e) {
    $('#loginErr').textContent = e.message
  }
}

function logout() {
  token = ''
  localStorage.removeItem('yyt_admin_token')
  $('#mainView').classList.add('hidden')
  $('#loginView').classList.remove('hidden')
}

function enterMain() {
  $('#loginView').classList.add('hidden')
  $('#mainView').classList.remove('hidden')
  $('#apiBase').textContent = 'API: ' + API
  switchTab(currentTab)
}

// ---------- 标签页 ----------
const TAB_TITLES = {
  overview: '数据概览', services: '服务管理', products: '商品管理', booking: '预约订单',
  porder: '商品订单', users: '用户与档案', diseases: '疾病管理', acupoints: '穴位管理', settings: '基础配置'
}

function switchTab(tab) {
  currentTab = tab
  document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('active', a.dataset.tab === tab))
  $('#pageTitle').textContent = TAB_TITLES[tab] || tab
  const renderers = {
    overview: renderOverview, services: () => renderEntity('services', '服务'), products: () => renderEntity('products', '商品'),
    diseases: () => renderEntity('diseases', '疾病'), acupoints: () => renderEntity('acupoints', '穴位'),
    booking: () => renderOrders('booking'), porder: () => renderOrders('product'), users: renderUsers, settings: renderSettings
  }
  ;(renderers[tab] || renderOverview)()
}

// ---------- 概览 ----------
async function renderOverview() {
  $('#pageBody').innerHTML = '<div class="muted">加载中…</div>'
  const d = await api('/api/admin/overview')
  const cards = [
    ['用户数', d.userCount], ['预约订单', d.bookingOrders], ['商品订单', d.productOrders],
    ['健康档案', d.healthRecords], ['体质报告', d.constitutionResults], ['理疗服务', d.serviceCount],
    ['在售商品', d.productCount], ['疾病条目', d.diseaseCount], ['穴位条目', d.acupointCount]
  ]
  $('#pageBody').innerHTML =
    '<div class="stats">' +
    cards.map(([l, n]) => `<div class="stat-card"><div class="num">${n}</div><div class="label">${l}</div></div>`).join('') +
    '</div>'
}

// ---------- 通用实体管理（服务/商品/疾病/穴位） ----------
const FIELD_LABELS = {
  id: 'ID', name: '名称', alias: '别名', category: '分类', cover: '封面图URL', price: '价格(元)', originalPrice: '原价(元)',
  duration: '时长(分钟)', intro: '简介', efficacy: '功效列表', suitable: '适用人群', caution: '注意事项', steps: '服务流程',
  popular: '热门', unit: '单位', sales: '销量', tags: '标签', description: '详情描述', specs: '规格列表', detailImages: '详情图URLs',
  usage: '使用方法', hot: '热销', symptoms: '症状', tcmDiagnosis: '中医辨证', tcmTreatment: '中医调理', diet: '食疗方案',
  dietRecipes: '食疗方剂', lifestyle: '生活指导', precautions: '注意事项', meridian: '所属经络', location: '定位', massage: '按摩方法',
  indication: '主治', address: '地址', phone: '电话', distance: '距离(km)', businessHours: '营业时间', part: '身体部位(key)', effect: '功效标签', video: '教学视频', image: '穴位图片'
}

// 媒体上传辅助（视频/图片）：上传到 /api/admin/media，返回 { url, id }
async function uploadMedia(file, entityId) {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('entityType', 'acupoints')
  fd.append('entityId', entityId || '')
  const token = localStorage.getItem('yyt_admin_token') || ''
  const resp = await fetch('/api/admin/media', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token },
    body: fd
  })
  const r = await resp.json()
  if (r.code !== 0) throw new Error(r.msg || '上传失败')
  return r.data
}

function fieldRow(k, v) {
  const label = FIELD_LABELS[k] || k
  const hint = k === 'id' ? '<div class="form-hint">唯一标识，创建后不可改</div>' : ''
  if (typeof v === 'boolean') {
    return `<div class="form-item" data-k="${k}"><label>${label}</label>
      <select data-k="${k}"><option value="true" ${v ? 'selected' : ''}>是 (true)</option><option value="false" ${!v ? 'selected' : ''}>否 (false)</option></select></div>`
  }
  // 媒体字段（视频/图片）：上传控件 + 预览
  if (k === 'video' || k === 'image') {
    const val = String(v || '')
    const isVideo = k === 'video'
    const accept = isVideo ? 'video/*' : 'image/*'
    const preview = val
      ? isVideo
        ? `<video src="${esc(val)}" controls style="max-width:100%;max-height:240px;border-radius:6px;margin-bottom:8px;"></video>`
        : `<img src="${esc(val)}" style="max-width:100%;max-height:240px;border-radius:6px;margin-bottom:8px;"/>`
      : ''
    const clearLabel = isVideo ? '清除视频' : '清除图片'
    const hint = isVideo
      ? '支持 mp4/webm 等小视频，文件存服务器磁盘，MySQL 记录路径，小程序端可播放'
      : '支持 jpg/png/webp 等图片，文件存服务器磁盘，MySQL 记录路径'
    return `<div class="form-item" data-k="${k}"><label>${label}</label>
      <input type="hidden" data-k-val value="${esc(val)}"/>
      ${preview}
      <div class="media-upload-area" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <input type="file" accept="${accept}" data-media-upload style="font-size:13px;"/>
        ${val ? `<button type="button" class="btn small ghost" data-media-clear>${clearLabel}</button>` : ''}
        <span class="media-status muted" style="font-size:12px;"></span>
      </div>
      <div class="form-hint">${hint}</div>
    </div>`
  }
  const isJson = Array.isArray(v) || (typeof v === 'object' && v !== null)
  const val = isJson ? JSON.stringify(v, null, 2) : v
  return `<div class="form-item" data-k="${k}"><label>${label}</label>
    ${isJson || String(val).length > 60 || k === 'intro' || k === 'description' || k === 'tcmDiagnosis' || k === 'location' || k === 'massage' || k === 'usage'
      ? `<textarea data-k="${k}">${esc(val)}</textarea><div class="form-hint">${isJson ? 'JSON 格式' : ''}</div>` 
      : `<input data-k="${k}" value="${esc(val)}" ${k === 'id' && v ? 'readonly' : ''}/>`}
    ${hint}</div>`
}

function openForm(title, record, onSave) {
  $('#modalTitle').textContent = title
  const rows = Object.entries(record).map(([k, v]) => fieldRow(k, v)).join('')
  $('#modalBody').innerHTML = rows
  $('#modalMask').classList.remove('hidden')

  // 绑定媒体（视频/图片）上传/清除控件
  $('#modalBody').querySelectorAll('[data-k="video"], [data-k="image"]').forEach((row) => {
    const hidden = row.querySelector('[data-k-val]')
    const fileInput = row.querySelector('[data-media-upload]')
    const clearBtn = row.querySelector('[data-media-clear]')
    const status = row.querySelector('.media-status')
    const entityId = record.id || ''
    const isVideo = row.dataset.k === 'video'
    if (fileInput) {
      fileInput.onchange = async () => {
        const f = fileInput.files[0]
        if (!f) return
        status.textContent = '上传中…'
        try {
          const r = await uploadMedia(f, entityId)
          hidden.value = r.url
          // 刷新预览
          let preview = row.querySelector(isVideo ? 'video' : 'img')
          if (!preview) {
            preview = document.createElement(isVideo ? 'video' : 'img')
            if (isVideo) preview.controls = true
            preview.style.cssText = 'max-width:100%;max-height:240px;border-radius:6px;margin-bottom:8px;'
            row.insertBefore(preview, row.querySelector('.media-upload-area'))
          }
          preview.src = r.url
          status.textContent = `已上传：${r.filename}（${(r.size/1024).toFixed(1)} KB）`
        } catch (e) {
          status.textContent = '上传失败：' + e.message
        }
      }
    }
    if (clearBtn) {
      clearBtn.onclick = () => {
        hidden.value = ''
        const preview = row.querySelector(isVideo ? 'video' : 'img')
        if (preview) preview.remove()
        status.textContent = '已清除'
      }
    }
  })

  $('#modalSave').onclick = async () => {
    const obj = {}
    $('#modalBody').querySelectorAll('[data-k]').forEach((el) => {
      const k = el.dataset.k
      // 带 data-k-val 的字段（如 video）从隐藏输入取值
      const valEl = el.querySelector('[data-k-val]')
      if (valEl) { obj[k] = valEl.value; return }
      if (el.tagName === 'TEXTAREA') {
        try { obj[k] = JSON.parse(el.value) } catch { obj[k] = el.value }
      } else if (el.tagName === 'SELECT') {
        obj[k] = el.value === 'true'
      } else {
        const orig = record[k]
        obj[k] = typeof orig === 'number' && el.value !== '' && !isNaN(Number(el.value)) ? Number(el.value) : el.value
      }
    })
    try {
      await onSave(obj)
      closeModal()
      toast('已保存')
    } catch (e) {
      toast(e.message)
    }
  }
}

function closeModal() { $('#modalMask').classList.add('hidden') }

const ENTITY_COLS = {
  services: ['id', 'name', 'category', 'price', 'duration', 'popular'],
  products: ['id', 'name', 'category', 'price', 'unit', 'sales', 'hot'],
  diseases: ['id', 'name', 'alias', 'category'],
  acupoints: ['id', 'name', 'part', 'meridian']
}

async function renderEntity(type, label) {
  $('#pageBody').innerHTML = '<div class="muted">加载中…</div>'
  const list = await api('/api/admin/catalog/' + type)
  // 穴位确保有 video/image 字段（老数据可能没有），以便显示上传控件
  if (type === 'acupoints') list.forEach((it) => { if (!('video' in it)) it.video = ''; if (!('image' in it)) it.image = '' })
  const cols = ENTITY_COLS[type]
  const rows = list.map((it) => '<tr>' + cols.map((c) => `<td>${esc(it[c])}</td>`).join('') +
    `<td><button class="btn small ghost" data-edit="${esc(it.id)}">编辑</button>
     <button class="btn small danger" data-del="${esc(it.id)}">删除</button></td></tr>`).join('')
  $('#pageBody').innerHTML = `
    <div class="toolbar">
      <input id="kw" placeholder="搜索 ${label}名称/ID…" />
      <button class="btn primary" id="addBtn">+ 新增${label}</button>
    </div>
    <div class="table-wrap"><table>
      <thead><tr>${cols.map((c) => `<th>${FIELD_LABELS[c] || c}</th>`).join('')}<th>操作</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="99" class="muted">暂无数据</td></tr>'}</tbody>
    </table></div>`

  const filtered = () => {
    const kw = $('#kw').value.trim()
    document.querySelectorAll('tbody tr').forEach((tr) => {
      tr.style.display = !kw || tr.textContent.includes(kw) ? '' : 'none'
    })
  }
  $('#kw').oninput = filtered
  $('#addBtn').onclick = () => {
    const template = list[0] ? { ...list[0] } : { id: '' }
    const blank = {}
    Object.keys(template).forEach((k) => {
      const v = template[k]
      blank[k] = typeof v === 'boolean' ? false : typeof v === 'number' ? 0 : Array.isArray(v) ? [] : typeof v === 'object' && v ? [] : ''
    })
    blank.id = ''
    if (type === 'acupoints') { blank.video = ''; blank.image = '' }
    openForm(`新增${label}`, blank, async (obj) => { await api('/api/admin/catalog/' + type, 'POST', obj) }).then(() => {})
    $('#modalSave').addEventListener('click', () => setTimeout(switchTabReload, 50), { once: true })
    function switchTabReload() { switchTab(type) }
  }
  document.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.onclick = () => {
      const it = list.find((x) => x.id === btn.dataset.edit)
      openForm(`编辑${label}`, it, async (obj) => { await api('/api/admin/catalog/' + type + '/' + it.id, 'PUT', obj) })
      $('#modalSave').addEventListener('click', () => setTimeout(() => switchTab(type), 50), { once: true })
    }
  })
  document.querySelectorAll('[data-del]').forEach((btn) => {
    btn.onclick = async () => {
      if (!confirm('确认删除该条目？此操作不可恢复。')) return
      try {
        await api('/api/admin/catalog/' + type + '/' + btn.dataset.del, 'DELETE')
        toast('已删除')
        switchTab(type)
      } catch (e) { toast(e.message) }
    }
  })
}

// ---------- 订单管理 ----------
const ORDER_COLS = {
  booking: [
    ['id', '订单号'], ['serviceName', '服务'], ['storeName', '门店'], ['date', '日期'], ['time', '时段'],
    ['customerName', '客户'], ['customerPhone', '电话'], ['price', '金额'], ['status', '状态'], ['deviceId', '设备号']
  ],
  product: [
    ['id', '订单号'], ['totalAmount', '金额'], ['receiver', '收货人'], ['phone', '电话'],
    ['address', '地址'], ['status', '状态'], ['createdAt', '下单时间'], ['deviceId', '设备号']
  ]
}

async function renderOrders(type) {
  $('#pageBody').innerHTML = '<div class="muted">加载中…</div>'
  const list = await api('/api/admin/orders?type=' + type)
  const cols = ORDER_COLS[type]
  const statuses = type === 'booking' ? ['pending', 'confirmed', 'completed', 'cancelled'] : ['paid', 'shipped', 'completed', 'refunded']
  const rows = list.map((o) => '<tr>' + cols.map(([c]) => `<td>${c === 'status' ? statusTag(o.status) : esc(o[c])}</td>`).join('') +
    `<td><select data-oid="${esc(o.id)}" data-did="${esc(o.deviceId)}">${statuses.map((s) => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${STATUS_MAP[s][0]}</option>`).join('')}</select></td></tr>`).join('')
  $('#pageBody').innerHTML = `
    <div class="toolbar"><span>共 ${list.length} 条订单（按创建时间倒序）</span></div>
    <div class="table-wrap"><table>
      <thead><tr>${cols.map(([, l]) => `<th>${l}</th>`).join('')}<th>修改状态</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="99" class="muted">暂无订单</td></tr>'}</tbody>
    </table></div>`
  document.querySelectorAll('select[data-oid]').forEach((sel) => {
    sel.onchange = async () => {
      try {
        await api(`/api/admin/order/${encodeURIComponent(sel.dataset.did)}/${type}/${sel.dataset.oid}`, 'PATCH', { status: sel.value })
        toast('状态已更新')
      } catch (e) { toast(e.message) }
    }
  })
}

// ---------- 用户与档案 ----------
async function renderUsers() {
  $('#pageBody').innerHTML = '<div class="muted">加载中…</div>'
  const list = await api('/api/admin/users')
  const rows = list.map((u) => {
    const p = u.profile || {}
    return `<tr>
      <td>${esc(p.name || '未设置')}</td><td>${esc(p.gender === 'male' ? '男' : p.gender === 'female' ? '女' : '未知')}</td>
      <td>${esc(p.age || '-')}</td><td>${esc(p.phone || p.allergy || '-')}</td>
      <td>${u.counts.bookingOrders}</td><td>${u.counts.productOrders}</td>
      <td>${u.counts.healthRecords}</td><td>${u.counts.constitutionResults}</td>
      <td><button class="btn small ghost" data-detail="${esc(u.deviceId)}">查看详情</button></td></tr>`
  }).join('')
  $('#pageBody').innerHTML = `
    <div class="table-wrap"><table>
      <thead><tr><th>昵称</th><th>性别</th><th>年龄</th><th>联系方式/过敏史</th><th>预约单</th><th>商品单</th><th>档案</th><th>体质报告</th><th>操作</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="99" class="muted">暂无用户数据（小程序产生数据后自动上报）</td></tr>'}</tbody>
    </table></div>`
  document.querySelectorAll('[data-detail]').forEach((btn) => {
    btn.onclick = async () => {
      const u = await api('/api/admin/user/' + encodeURIComponent(btn.dataset.detail))
      openUserDetail(u)
    }
  })
}

function openUserDetail(u) {
  $('#modalTitle').textContent = '用户详情 · ' + (u.profile && u.profile.name ? u.profile.name : '未命名用户')
  const p = u.profile || {}
  const kv = (k, v) => `<div class="kv"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`
  const profileHtml = Object.entries(p).map(([k, v]) => kv(FIELD_LABELS[k] || k, v)).join('') || '<div class="muted">未填写档案</div>'
  const recordsHtml = u.healthRecords.map((r) =>
    `<div class="record-item"><b>${esc(r.title || r.type)}</b> <span class="muted">(${esc(r.type)}) ${esc((r.date || '').slice(0, 10))}</span><div>${esc(r.content || '')}</div></div>`).join('') || '<div class="muted">暂无</div>'
  const constHtml = u.constitutionResults.map((r) =>
    `<div class="record-item"><b>${esc(r.primary || '')}</b> <span class="muted">${esc((r.date || '').slice(0, 10))} 得分:${esc(JSON.stringify(r.scores || {}))}</span></div>`).join('') || '<div class="muted">暂无</div>'
  const orderHtml = [...u.bookingOrders.map((o) => `<div class="record-item">${statusTag(o.status)} ${esc(o.serviceName || '')} ${esc(o.date || '')} ${esc(o.time || '')}</div>`),
    ...u.productOrders.map((o) => `<div class="record-item">${statusTag(o.status)} ${esc(o.id)} ¥${esc(o.totalAmount || '')}</div>`)].join('') || '<div class="muted">暂无</div>'
  $('#modalBody').innerHTML = `
    <div class="detail-grid">
      <div class="detail-card"><h4>基本档案</h4>${profileHtml}</div>
      <div class="detail-card"><h4>订单记录</h4>${orderHtml}</div>
      <div class="detail-card"><h4>健康档案</h4>${recordsHtml}</div>
      <div class="detail-card"><h4>体质报告</h4>${constHtml}</div>
    </div>`
  $('#modalSave').textContent = '关闭'
  $('#modalSave').onclick = closeModal
  $('#modalMask').classList.remove('hidden')
}

// ---------- 基础配置（时段/热门/分类） ----------
async function renderSettings() {
  $('#pageBody').innerHTML = '<div class="muted">加载中…</div>'
  const c = await api('/api/catalog')
  const box = (title, json, onSave) =>
    `<div class="detail-card" style="margin-bottom:16px"><h4>${title}</h4>
     <textarea class="json-editor" style="width:100%;min-height:120px;border:1px solid #e8e0d4;border-radius:6px;padding:10px;font-family:monospace">${esc(JSON.stringify(json, null, 2))}</textarea>
     <div style="margin-top:10px;text-align:right"><button class="btn primary small">保存</button></div></div>`
  $('#pageBody').innerHTML =
    box('预约时段（字符串数组）', c.timeSlots, null) +
    box('热门疾病（字符串数组）', c.hotDiseases, null) +
    box('服务分类', c.categories.service, null) +
    box('商品分类', c.categories.product, null) +
    box('疾病分类', c.categories.disease, null)
  const editors = document.querySelectorAll('.json-editor')
  const payloads = [
    { url: '/api/admin/catalog/timeSlots', body: () => ({ items: JSON.parse(editors[0].value) }) },
    { url: '/api/admin/catalog/hotDiseases', body: () => ({ items: JSON.parse(editors[1].value) }) },
    { url: '/api/admin/catalog/categories', body: () => ({ kind: 'service', items: JSON.parse(editors[2].value) }) },
    { url: '/api/admin/catalog/categories', body: () => ({ kind: 'product', items: JSON.parse(editors[3].value) }) },
    { url: '/api/admin/catalog/categories', body: () => ({ kind: 'disease', items: JSON.parse(editors[4].value) }) }
  ]
  document.querySelectorAll('.detail-card .btn').forEach((btn, i) => {
    btn.onclick = async () => {
      try {
        JSON.parse(editors[i].value) // 校验
        await api(payloads[i].url, 'PUT', payloads[i].body())
        toast('已保存')
      } catch (e) { toast('保存失败: ' + e.message) }
    }
  })
}

// ---------- 事件绑定 ----------
$('#loginBtn').onclick = login
$('#loginPass').addEventListener('keydown', (e) => e.key === 'Enter' && login())
$('#logoutBtn').onclick = logout
$('#modalCancel').onclick = closeModal
$('#modalClose').onclick = closeModal
$('#modalMask').addEventListener('click', (e) => e.target === $('#modalMask') && closeModal())
document.querySelectorAll('#nav a').forEach((a) => (a.onclick = () => switchTab(a.dataset.tab)))

// 启动：有 token 则直接进入
if (token) enterMain()
else $('#loginView').classList.remove('hidden')
