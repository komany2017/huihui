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
  porder: '商品订单', users: '用户与档案', diseases: '疾病管理', acupoints: '穴位管理', stores: '门店管理', settings: '基础配置'
}

function switchTab(tab) {
  currentTab = tab
  document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('active', a.dataset.tab === tab))
  $('#pageTitle').textContent = TAB_TITLES[tab] || tab
  const renderers = {
    overview: renderOverview, services: () => renderEntity('services', '服务'), products: () => renderEntity('products', '商品'),
    diseases: () => renderEntity('diseases', '疾病'), acupoints: () => renderEntity('acupoints', '穴位'),
    stores: renderStores,
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
    ['在售商品', d.productCount], ['疾病条目', d.diseaseCount], ['穴位条目', d.acupointCount], ['门店数量', d.storeCount || 0]
  ]
  $('#pageBody').innerHTML =
    '<div class="stats">' +
    cards.map(([l, n]) => `<div class="stat-card"><div class="num">${n}</div><div class="label">${l}</div></div>`).join('') +
    '</div>'
}

// ---------- 通用实体管理（服务/商品/疾病/穴位） ----------
let currentEntityType = '' // 当前编辑的实体类型，用于媒体上传关联
const FIELD_LABELS = {
  id: 'ID', name: '名称', alias: '别名', category: '分类', cover: '封面图', price: '价格(元)', originalPrice: '原价(元)',
  duration: '时长(分钟)', intro: '简介', efficacy: '功效列表', suitable: '适用人群', caution: '注意事项', steps: '服务流程',
  popular: '热门', unit: '单位', sales: '销量', tags: '标签', description: '详情描述', specs: '规格列表', detailImages: '详情图',
  usage: '使用方法', hot: '热销', symptoms: '症状', tcmDiagnosis: '中医辨证', tcmTreatment: '中医调理', diet: '食疗方案',
  dietRecipes: '食疗方剂', lifestyle: '生活指导', precautions: '注意事项', meridian: '所属经络', location: '定位', massage: '按摩方法',
  indication: '主治', address: '地址', phone: '电话', distance: '距离(km)', businessHours: '营业时间', part: '身体部位(key)', effect: '功效标签', video: '教学视频', image: '穴位图片'
}

// 根据实体类型前缀 + 现有列表最大序号，生成唯一 id（如 s004、p002）
const ID_PREFIX = { services: 's', products: 'p', diseases: 'd', acupoints: 'a', stores: 'st' }
function genId(type, list) {
  const prefix = ID_PREFIX[type] || ''
  const nums = list
    .map((it) => parseInt(String(it.id || '').replace(/^\D+/, ''), 10))
    .filter((n) => !isNaN(n))
  const max = nums.length ? Math.max(...nums) : 0
  return prefix + String(max + 1).padStart(3, '0')
}

// 媒体上传辅助（视频/图片）：上传到 /api/admin/media，返回 { url, id }
async function uploadMedia(file, entityType, entityId) {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('entityType', entityType || 'acupoints')
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
  // 单图 URL 字段（封面图 cover / 穴位图片 image）
  if (k === 'cover' || k === 'image') {
    const val = String(v || '')
    const preview = val ? `<img src="${esc(val)}" style="max-width:100%;max-height:240px;border-radius:6px;margin-bottom:8px;"/>` : ''
    return `<div class="form-item" data-k="${k}"><label>${label}</label>
      <input type="hidden" data-k-val value="${esc(val)}"/>
      ${preview}
      <div class="media-upload-area" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <input type="file" accept="image/*" data-media-upload style="font-size:13px;"/>
        ${val ? `<button type="button" class="btn small ghost" data-media-clear>清除图片</button>` : ''}
        <span class="media-status muted" style="font-size:12px;"></span>
      </div>
      <div class="form-hint">支持 jpg/png/webp，上传后存服务器磁盘，URL 自动填入</div>
    </div>`
  }
  // 多图 URL 数组字段（详情图 detailImages）
  if (k === 'detailImages') {
    const arr = Array.isArray(v) ? v.filter(Boolean) : []
    const thumbs = arr.map((url, idx) => `
      <div class="thumb-item" data-idx="${idx}" style="position:relative;display:inline-block;margin:4px;">
        <img src="${esc(url)}" style="width:80px;height:80px;object-fit:cover;border-radius:4px;"/>
        <button type="button" class="btn small danger" data-thumb-del style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;padding:0;line-height:1;border-radius:50%;font-size:12px;">×</button>
      </div>`).join('')
    return `<div class="form-item" data-k="${k}"><label>${label}</label>
      <input type="hidden" data-k-val data-json="true" value="${esc(JSON.stringify(arr))}"/>
      <div class="thumb-grid" style="margin-bottom:8px;">${thumbs}</div>
      <div class="media-upload-area" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <input type="file" accept="image/*" data-media-upload-multi style="font-size:13px;"/>
        <span class="media-status muted" style="font-size:12px;"></span>
      </div>
      <div class="form-hint">支持多张 jpg/png/webp，逐张上传，可点 × 删除</div>
    </div>`
  }
  // 视频字段
  if (k === 'video') {
    const val = String(v || '')
    const preview = val ? `<video src="${esc(val)}" controls style="max-width:100%;max-height:240px;border-radius:6px;margin-bottom:8px;"></video>` : ''
    return `<div class="form-item" data-k="${k}"><label>${label}</label>
      <input type="hidden" data-k-val value="${esc(val)}"/>
      ${preview}
      <div class="media-upload-area" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <input type="file" accept="video/*" data-media-upload style="font-size:13px;"/>
        ${val ? `<button type="button" class="btn small ghost" data-media-clear>清除视频</button>` : ''}
        <span class="media-status muted" style="font-size:12px;"></span>
      </div>
      <div class="form-hint">支持 mp4/webm 等小视频，文件存服务器磁盘，小程序端可播放</div>
    </div>`
  }
  // 价格字段：number 输入 + 两位小数
  if (k === 'price' || k === 'originalPrice') {
    const num = Number(v)
    const val = isNaN(num) ? '' : num.toFixed(2)
    return `<div class="form-item" data-k="${k}"><label>${label}</label>
      <input type="number" step="0.01" min="0" data-k="${k}" value="${esc(val)}" ${k === 'id' ? 'readonly' : ''}/>
      <div class="form-hint">保留两位小数（如 99.00）</div>
    </div>`
  }
  const isJson = Array.isArray(v) || (typeof v === 'object' && v !== null)
  const val = isJson ? JSON.stringify(v, null, 2) : v
  return `<div class="form-item" data-k="${k}"><label>${label}</label>
    ${isJson || String(val).length > 60 || k === 'intro' || k === 'description' || k === 'tcmDiagnosis' || k === 'location' || k === 'massage' || k === 'usage'
      ? `<textarea data-k="${k}">${esc(val)}</textarea><div class="form-hint">${isJson ? 'JSON 格式' : ''}</div>` 
      : `<input data-k="${k}" value="${esc(val)}" ${k === 'id' ? 'readonly' : ''}/>`}
    ${hint}</div>`
}

function openForm(title, record, onSave) {
  $('#modalTitle').textContent = title
  const rows = Object.entries(record).map(([k, v]) => fieldRow(k, v)).join('')
  $('#modalBody').innerHTML = rows
  $('#modalMask').classList.remove('hidden')

  // 绑定单图/视频上传控件（cover / image / video）
  $('#modalBody').querySelectorAll('[data-k="video"], [data-k="image"], [data-k="cover"]').forEach((row) => {
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
          const r = await uploadMedia(f, currentEntityType, entityId)
          hidden.value = r.url
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

  // 绑定多图数组上传控件（detailImages）
  $('#modalBody').querySelectorAll('[data-k="detailImages"]').forEach((row) => {
    const hidden = row.querySelector('[data-k-val]')
    const fileInput = row.querySelector('[data-media-upload-multi]')
    const status = row.querySelector('.media-status')
    const grid = row.querySelector('.thumb-grid')
    const entityId = record.id || ''
    function getArr() { try { return JSON.parse(hidden.value || '[]') } catch { return [] } }
    function setArr(arr) { hidden.value = JSON.stringify(arr); renderThumbs(arr) }
    function renderThumbs(arr) {
      grid.innerHTML = arr.map((url, idx) => `
        <div class="thumb-item" data-idx="${idx}" style="position:relative;display:inline-block;margin:4px;">
          <img src="${esc(url)}" style="width:80px;height:80px;object-fit:cover;border-radius:4px;"/>
          <button type="button" class="btn small danger" data-thumb-del style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;padding:0;line-height:1;border-radius:50%;font-size:12px;">×</button>
        </div>`).join('')
      grid.querySelectorAll('[data-thumb-del]').forEach((btn) => {
        btn.onclick = () => {
          const i = Number(btn.parentElement.dataset.idx)
          const a = getArr()
          a.splice(i, 1)
          setArr(a)
        }
      })
    }
    if (fileInput) {
      fileInput.onchange = async () => {
        const f = fileInput.files[0]
        if (!f) return
        status.textContent = '上传中…'
        try {
          const r = await uploadMedia(f, currentEntityType, entityId)
          const a = getArr()
          a.push(r.url)
          setArr(a)
          status.textContent = `已上传：${r.filename}（共 ${a.length} 张）`
        } catch (e) {
          status.textContent = '上传失败：' + e.message
        }
        fileInput.value = ''
      }
    }
  })

  $('#modalSave').onclick = async () => {
    const obj = {}
    $('#modalBody').querySelectorAll('[data-k]').forEach((el) => {
      const k = el.dataset.k
      // 带 data-k-val 的字段从隐藏输入取值；data-json 则解析为数组/对象
      const valEl = el.querySelector('[data-k-val]')
      if (valEl) {
        if (valEl.dataset.json === 'true') { try { obj[k] = JSON.parse(valEl.value) } catch { obj[k] = [] } }
        else { obj[k] = valEl.value }
        return
      }
      if (el.tagName === 'TEXTAREA') {
        try { obj[k] = JSON.parse(el.value) } catch { obj[k] = el.value }
      } else if (el.tagName === 'SELECT') {
        obj[k] = el.value === 'true'
      } else {
        const orig = record[k]
        if (k === 'price' || k === 'originalPrice') {
          // 价格强制保留两位小数
          const n = Number(el.value)
          obj[k] = el.value === '' || isNaN(n) ? 0 : Number(n.toFixed(2))
        } else {
          obj[k] = typeof orig === 'number' && el.value !== '' && !isNaN(Number(el.value)) ? Number(el.value) : el.value
        }
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

// 通用弹窗：自定义 HTML body，保存时按 [data-k] 收集表单数据
function openModal(title, body, onSave, showSave) {
  $('#modalTitle').textContent = title
  $('#modalBody').innerHTML = body
  $('#modalSave').textContent = '保存'
  $('#modalSave').style.display = showSave === false ? 'none' : ''
  $('#modalMask').classList.remove('hidden')
  $('#modalSave').onclick = async () => {
    const obj = {}
    $('#modalBody').querySelectorAll('[data-k]').forEach((el) => {
      const k = el.dataset.k
      const valEl = el.querySelector('[data-k-val]')
      if (valEl) {
        if (valEl.dataset.json === 'true') { try { obj[k] = JSON.parse(valEl.value) } catch { obj[k] = [] } }
        else { obj[k] = valEl.value }
        return
      }
      if (el.tagName === 'TEXTAREA') {
        try { obj[k] = JSON.parse(el.value) } catch { obj[k] = el.value }
      } else if (el.tagName === 'SELECT') {
        obj[k] = el.value
      } else {
        obj[k] = el.value
      }
    })
    try {
      await onSave(obj)
      closeModal()
    } catch (e) {
      toast(e.message)
    }
  }
}

const ENTITY_COLS = {
  services: ['id', 'name', 'category', 'price', 'duration', 'popular'],
  products: ['id', 'name', 'category', 'price', 'unit', 'sales', 'hot'],
  diseases: ['id', 'name', 'alias', 'category'],
  acupoints: ['id', 'name', 'part', 'meridian']
}

// ---------- 门店管理（独立 stores 表，含扩展信息/服务关联/变更日志） ----------
async function renderStores() {
  $('#pageBody').innerHTML = '<div class="muted">加载中…</div>'
  const list = await api('/api/admin/stores')
  const rows = list.map((s) => `<tr>
    <td>${esc(s.id)}</td>
    <td>${esc(s.name)}</td>
    <td>${esc(s.address)}</td>
    <td>${esc(s.phone)}</td>
    <td>${esc(s.businessHours)}</td>
    <td>${s.status === 'active' ? '<span class="tag confirmed">营业中</span>' : '<span class="tag refunded">已停用</span>'}</td>
    <td>
      <button class="btn small ghost" data-edit="${esc(s.id)}">编辑</button>
      <button class="btn small ghost" data-ext="${esc(s.id)}">扩展</button>
      <button class="btn small ghost" data-svc="${esc(s.id)}">服务</button>
      <button class="btn small ghost" data-log="${esc(s.id)}">日志</button>
      <button class="btn small danger" data-del="${esc(s.id)}">删除</button>
    </td>
  </tr>`).join('')
  $('#pageBody').innerHTML = `
    <div class="toolbar">
      <button class="btn primary" id="addStoreBtn">+ 新增门店</button>
      <button class="btn ghost" id="checkConsistencyBtn">一致性校验</button>
      <span id="consistencyResult" class="muted" style="margin-left:12px;"></span>
    </div>
    <table class="data-table">
      <thead><tr><th>ID</th><th>名称</th><th>地址</th><th>电话</th><th>营业时间</th><th>状态</th><th>操作</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="7" class="muted" style="text-align:center;padding:24px;">暂无门店</td></tr>'}</tbody>
    </table>`
  $('#addStoreBtn').onclick = () => openStoreModal(null, list)
  $('#checkConsistencyBtn').onclick = async () => {
    try {
      const r = await api('/api/admin/stores/consistency')
      $('#consistencyResult').textContent = `共 ${r.total} 家门店，${r.issues.length} 个问题`
      if (r.issues.length) {
        const msgs = r.issues.slice(0, 5).map((i) => `${i.storeId}: ${i.msg}`).join('；')
        toast(`发现问题：${msgs}${r.issues.length > 5 ? '...' : ''}`)
      } else {
        toast('数据一致性校验通过')
      }
    } catch (e) { toast(e.message) }
  }
  $('#pageBody').querySelectorAll('[data-edit]').forEach((b) => {
    b.onclick = async () => {
      const id = b.dataset.edit
      const s = await api('/api/admin/stores/' + encodeURIComponent(id))
      openStoreModal(s, list)
    }
  })
  $('#pageBody').querySelectorAll('[data-ext]').forEach((b) => {
    b.onclick = () => openStoreExtModal(b.dataset.ext)
  })
  $('#pageBody').querySelectorAll('[data-svc]').forEach((b) => {
    b.onclick = () => openStoreServiceModal(b.dataset.svc)
  })
  $('#pageBody').querySelectorAll('[data-log]').forEach((b) => {
    b.onclick = () => openStoreLogModal(b.dataset.log)
  })
  $('#pageBody').querySelectorAll('[data-del]').forEach((b) => {
    b.onclick = async () => {
      if (!confirm('确定删除该门店？相关扩展信息和服务关联将一并清除。')) return
      try {
        await api('/api/admin/stores/' + encodeURIComponent(b.dataset.del), 'DELETE')
        toast('已删除')
        renderStores()
      } catch (e) { toast(e.message) }
    }
  })
}

function openStoreModal(store, list) {
  const isEdit = !!store
  const blank = { id: isEdit ? store.id : genId('stores', list), name: '', address: '', phone: '', businessHours: '', cover: '', status: 'active', sortOrder: 0 }
  const s = { ...blank, ...(store || {}) }
  const body = `
    <div class="form-item"><label>门店 ID</label><input data-k="id" value="${esc(s.id)}" readonly/></div>
    <div class="form-item"><label>门店名称 *</label><input data-k="name" value="${esc(s.name)}"/></div>
    <div class="form-item"><label>地址</label><input data-k="address" value="${esc(s.address)}"/></div>
    <div class="form-item"><label>联系电话</label><input data-k="phone" value="${esc(s.phone)}"/></div>
    <div class="form-item"><label>营业时间</label><input data-k="businessHours" value="${esc(s.businessHours)}" placeholder="如 09:00 - 21:00"/></div>
    <div class="form-item"><label>排序</label><input data-k="sortOrder" type="number" value="${s.sortOrder || 0}"/></div>
    <div class="form-item"><label>状态</label>
      <select data-k="status">
        <option value="active" ${s.status === 'active' ? 'selected' : ''}>营业中</option>
        <option value="inactive" ${s.status === 'inactive' ? 'selected' : ''}>已停用</option>
      </select>
    </div>
    <div class="form-item" data-k="cover"><label>封面图</label>
      <input type="hidden" data-k-val value="${esc(s.cover || '')}"/>
      ${s.cover ? `<img src="${esc(s.cover)}" style="max-width:100%;max-height:200px;border-radius:6px;margin-bottom:8px;"/>` : ''}
      <div class="media-upload-area"><input type="file" accept="image/*" data-media-upload style="font-size:13px;"/><span class="media-status muted" style="font-size:12px;"></span></div>
    </div>`
  openModal(isEdit ? '编辑门店' : '新增门店', body, async (obj) => {
    if (!obj.name) throw new Error('门店名称不能为空')
    obj.sortOrder = Number(obj.sortOrder) || 0
    const method = isEdit ? 'PUT' : 'POST'
    const url = isEdit ? '/api/admin/stores/' + encodeURIComponent(obj.id) : '/api/admin/stores'
    await api(url, method, obj)
    toast(isEdit ? '已更新' : '已创建')
    renderStores()
  })
  // 绑定封面图上传
  bindSingleMediaUpload($('#modalBody').querySelector('[data-k="cover"]'), s.id, 'stores')
}

function openStoreExtModal(storeId) {
  api('/api/admin/stores/' + encodeURIComponent(storeId) + '/extension').then((ext) => {
    const e = ext || {}
    const fac = Array.isArray(e.facilities) ? e.facilities.join('、') : ''
    const body = `
      <div class="form-item"><label>门店介绍</label><textarea data-k="description" rows="4">${esc(e.description || '')}</textarea></div>
      <div class="form-item"><label>纬度</label><input data-k="latitude" type="number" step="0.0000001" value="${e.latitude ?? ''}"/></div>
      <div class="form-item"><label>经度</label><input data-k="longitude" type="number" step="0.0000001" value="${e.longitude ?? ''}"/></div>
      <div class="form-item"><label>店长姓名</label><input data-k="managerName" value="${esc(e.managerName || '')}"/></div>
      <div class="form-item"><label>店长电话</label><input data-k="managerPhone" value="${esc(e.managerPhone || '')}"/></div>
      <div class="form-item"><label>经营面积(㎡)</label><input data-k="area" type="number" step="0.01" value="${e.area ?? ''}"/></div>
      <div class="form-item"><label>设施（逗号分隔）</label><input data-k="facilities" value="${esc(fac)}"/></div>
      <div class="form-item" data-k="images"><label>门店图片</label>
        <input type="hidden" data-k-val data-json="true" value="${esc(JSON.stringify(e.images || []))}"/>
        <div class="thumb-grid">${(e.images || []).map((url, idx) => `<div class="thumb-item" data-idx="${idx}" style="position:relative;display:inline-block;margin:4px;"><img src="${esc(url)}" style="width:80px;height:80px;object-fit:cover;border-radius:4px;"/><button type="button" class="btn small danger" data-thumb-del style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;padding:0;line-height:1;border-radius:50%;font-size:12px;">×</button></div>`).join('')}</div>
        <div class="media-upload-area"><input type="file" accept="image/*" data-media-upload-multi style="font-size:13px;"/><span class="media-status muted" style="font-size:12px;"></span></div>
      </div>`
    openModal('门店扩展信息', body, async (obj) => {
      if (obj.facilities) obj.facilities = String(obj.facilities).split(/[,，]/).map((x) => x.trim()).filter(Boolean)
      if (obj.latitude !== undefined && obj.latitude !== '') obj.latitude = Number(obj.latitude)
      if (obj.longitude !== undefined && obj.longitude !== '') obj.longitude = Number(obj.longitude)
      if (obj.area !== undefined && obj.area !== '') obj.area = Number(obj.area)
      await api('/api/admin/stores/' + encodeURIComponent(storeId) + '/extension', 'PUT', obj)
      toast('扩展信息已保存')
    })
    bindMultiMediaUpload($('#modalBody').querySelector('[data-k="images"]'), storeId, 'stores')
  }).catch((e) => toast(e.message))
}

async function openStoreServiceModal(storeId) {
  const [list, services] = await Promise.all([
    api('/api/admin/stores/' + encodeURIComponent(storeId) + '/services'),
    api('/api/admin/catalog/services')
  ])
  const svcMap = {}
  services.forEach((s) => (svcMap[s.id] = s))
  const rows = list.map((r) => `<tr>
    <td>${esc(r.serviceId)}</td><td>${esc(svcMap[r.serviceId]?.name || '-')}</td>
    <td>${r.price != null ? Number(r.price).toFixed(2) : '-'}</td>
    <td>${r.available ? '<span class="tag confirmed">启用</span>' : '<span class="tag refunded">停用</span>'}</td>
    <td><button class="btn small danger" data-unbind="${esc(r.serviceId)}">解除</button></td>
  </tr>`).join('')
  const opts = services.map((s) => `<option value="${esc(s.id)}">${esc(s.id)} - ${esc(s.name)}</option>`).join('')
  const body = `
    <table class="data-table"><thead><tr><th>服务ID</th><th>服务名</th><th>价格</th><th>状态</th><th>操作</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="5" class="muted" style="text-align:center;padding:16px;">暂无关联服务</td></tr>'}</tbody></table>
    <div style="margin-top:16px;padding-top:16px;border-top:1px solid #eee;">
      <div class="form-item" style="display:inline-block;margin-right:12px;"><label>选择服务</label><select id="bindSvcId">${opts}</select></div>
      <div class="form-item" style="display:inline-block;margin-right:12px;"><label>价格(留空用原价)</label><input id="bindSvcPrice" type="number" step="0.01"/></div>
      <button class="btn primary" id="bindSvcBtn" style="margin-top:22px;">关联服务</button>
    </div>`
  openModal('门店服务关联', body, async () => {}, false) // 非保存型弹窗
  $('#modalSave').style.display = 'none'
  $('#bindSvcBtn').onclick = async () => {
    const sid = $('#bindSvcId').value
    const price = $('#bindSvcPrice').value
    try {
      await api('/api/admin/stores/' + encodeURIComponent(storeId) + '/services', 'POST', { serviceId: sid, price: price ? Number(price) : null })
      toast('已关联')
      openStoreServiceModal(storeId)
    } catch (e) { toast(e.message) }
  }
  $('#modalBody').querySelectorAll('[data-unbind]').forEach((b) => {
    b.onclick = async () => {
      try {
        await api('/api/admin/stores/' + encodeURIComponent(storeId) + '/services/' + encodeURIComponent(b.dataset.unbind), 'DELETE')
        toast('已解除')
        openStoreServiceModal(storeId)
      } catch (e) { toast(e.message) }
    }
  })
}

async function openStoreLogModal(storeId) {
  const logs = await api('/api/admin/stores/' + encodeURIComponent(storeId) + '/logs')
  const ACTION_TEXT = { create: '创建', update: '更新', delete: '删除', update_extension: '更新扩展', bind_service: '关联服务', unbind_service: '解除服务' }
  const rows = logs.map((l) => `<tr>
    <td>${esc(l.createdAt)}</td>
    <td><span class="tag confirmed">${esc(ACTION_TEXT[l.action] || l.action)}</span></td>
    <td>${esc(l.operator)}</td>
    <td>${esc(JSON.stringify(l.detail || {}))}</td>
  </tr>`).join('')
  const body = `<table class="data-table"><thead><tr><th>时间</th><th>操作</th><th>操作人</th><th>详情</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="4" class="muted" style="text-align:center;padding:16px;">暂无日志</td></tr>'}</tbody></table>`
  openModal('门店变更日志', body, async () => {}, false)
  $('#modalSave').style.display = 'none'
}

// 单图上传绑定
function bindSingleMediaUpload(row, entityId, entityType) {
  if (!row) return
  const hidden = row.querySelector('[data-k-val]')
  const fileInput = row.querySelector('[data-media-upload]')
  const status = row.querySelector('.media-status')
  if (fileInput) {
    fileInput.onchange = async () => {
      const f = fileInput.files[0]
      if (!f) return
      status.textContent = '上传中…'
      try {
        const r = await uploadMedia(f, entityType, entityId)
        hidden.value = r.url
        const preview = row.querySelector('img')
        if (preview) preview.src = r.url
        status.textContent = `已上传：${r.filename}`
      } catch (e) { status.textContent = '上传失败：' + e.message }
      fileInput.value = ''
    }
  }
}

// 多图上传绑定
function bindMultiMediaUpload(row, entityId, entityType) {
  if (!row) return
  const hidden = row.querySelector('[data-k-val]')
  const fileInput = row.querySelector('[data-media-upload-multi]')
  const status = row.querySelector('.media-status')
  const grid = row.querySelector('.thumb-grid')
  function getArr() { try { return JSON.parse(hidden.value || '[]') } catch { return [] } }
  function setArr(arr) { hidden.value = JSON.stringify(arr); renderThumbs(arr) }
  function renderThumbs(arr) {
    grid.innerHTML = arr.map((url, idx) => `<div class="thumb-item" data-idx="${idx}" style="position:relative;display:inline-block;margin:4px;"><img src="${esc(url)}" style="width:80px;height:80px;object-fit:cover;border-radius:4px;"/><button type="button" class="btn small danger" data-thumb-del style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;padding:0;line-height:1;border-radius:50%;font-size:12px;">×</button></div>`).join('')
    grid.querySelectorAll('[data-thumb-del]').forEach((btn) => {
      btn.onclick = () => { const a = getArr(); a.splice(Number(btn.parentElement.dataset.idx), 1); setArr(a) }
    })
  }
  if (fileInput) {
    fileInput.onchange = async () => {
      const f = fileInput.files[0]
      if (!f) return
      status.textContent = '上传中…'
      try {
        const r = await uploadMedia(f, entityType, entityId)
        const a = getArr(); a.push(r.url); setArr(a)
        status.textContent = `已上传（共 ${a.length} 张）`
      } catch (e) { status.textContent = '上传失败：' + e.message }
      fileInput.value = ''
    }
  }
}

async function renderEntity(type, label) {
  currentEntityType = type
  $('#pageBody').innerHTML = '<div class="muted">加载中…</div>'
  const list = await api('/api/admin/catalog/' + type)
  // 确保所有实体有 cover 字段；穴位有 video/image；商品有 detailImages
  list.forEach((it) => { if (!('cover' in it)) it.cover = '' })
  if (type === 'acupoints') list.forEach((it) => { if (!('video' in it)) it.video = ''; if (!('image' in it)) it.image = '' })
  if (type === 'products') list.forEach((it) => { if (!('detailImages' in it)) it.detailImages = [] })
  const cols = ENTITY_COLS[type]
  // 价格列格式化为两位小数
  const fmtCell = (it, c) => {
    if (c === 'price' || c === 'originalPrice') {
      const n = Number(it[c])
      return isNaN(n) ? esc(it[c]) : n.toFixed(2)
    }
    return esc(it[c])
  }
  const rows = list.map((it) => '<tr>' + cols.map((c) => `<td>${fmtCell(it, c)}</td>`).join('') +
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
    blank.id = genId(type, list)
    if (!('cover' in blank)) blank.cover = ''
    if (type === 'acupoints') { blank.video = ''; blank.image = '' }
    if (type === 'products') { blank.detailImages = [] }
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
