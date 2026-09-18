// Node.js 云托管打包脚本：生成可直接上传微信云托管的代码包（zip 根目录含 Dockerfile）
// 产物：server/dist/ruanquan-cloud.zip
// 用法：node package-cloud.js [--no-data]  （--no-data 不携带 db.json，跳过数据自动导入）
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const NO_DATA = process.argv.includes('--no-data')
const serverDir = path.join(__dirname, 'server')
const distDir = path.join(serverDir, 'dist')
const outZip = path.join(distDir, 'ruanquan-cloud.zip')

// ---------- 容器化文件（写入 zip 根目录）----------
const DOCKERFILE = [
  '# 润泉养元后台服务（微信云托管）',
  'FROM node:18-alpine',
  'WORKDIR /app',
  'COPY package.json ./',
  'RUN npm install --omit=dev --registry=https://registry.npmmirror.com',
  'COPY index.js store.js db.js seed.js ./',
  'COPY admin ./admin',
  'COPY src-data ./src-data',
  ...(NO_DATA ? [] : ['COPY data/db.json ./data/db.json']),
  'RUN mkdir -p uploads/media cache/images logs',
  'ENV PORT=8080 NODE_ENV=production',
  'EXPOSE 8080',
  'CMD ["node", "index.js"]'
].join('\n') + '\n'

const DOCKERIGNORE = ['node_modules', 'dist', '*.zip', '*.ps1', '*.bat', '*.md'].join('\n') + '\n'

const PKG_JSON = JSON.stringify({
  name: 'ruanquan-server',
  version: '1.0.0',
  private: true,
  engines: { node: '>=18' },
  scripts: { start: 'node index.js' },
  dependencies: { mysql2: '^3.11.0' }
}, null, 2) + '\n'

// ---------- 组装 zip 条目 ----------
const entries = []
const add = (name, data) => entries.push({ name, data: Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8') })
const walk = (dir, prefix) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) walk(path.join(dir, e.name), `${prefix}${e.name}/`)
    else add(`${prefix}${e.name}`, fs.readFileSync(path.join(dir, e.name)))
  }
}

console.log('==> 组装云托管代码包（Dockerfile 置于 zip 根目录）')
add('Dockerfile', DOCKERFILE)
add('.dockerignore', DOCKERIGNORE)
add('package.json', PKG_JSON)
for (const f of ['index.js', 'store.js', 'db.js', 'seed.js']) {
  add(f, fs.readFileSync(path.join(serverDir, f)))
  console.log('  +', f)
}
walk(path.join(serverDir, 'admin'), 'admin/')
for (const f of ['services.ts', 'products.ts', 'diseases.ts', 'acupoints.ts']) {
  add(`src-data/${f}`, fs.readFileSync(path.join(__dirname, 'src', 'data', f)))
}
if (!NO_DATA) {
  add('data/db.json', fs.readFileSync(path.join(serverDir, 'data', 'db.json')))
  console.log('  + data/db.json（MySQL 空库时自动导入）')
}

// ---------- ZIP 打包（POSIX 路径条目 + deflate）----------
const crcTable = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()
function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ crcTable[(c ^ buf[i]) & 0xff]
  return (c ^ -1) >>> 0
}
function buildZip(items) {
  const now = new Date()
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()
  const chunks = [], central = []
  let offset = 0
  for (const e of items) {
    const nameBuf = Buffer.from(e.name, 'utf8')
    const body = zlib.deflateRawSync(e.data, { level: 9 })
    const crc = crc32(e.data)
    const lh = Buffer.alloc(30)
    lh.writeUInt32LE(0x04034b50, 0)
    lh.writeUInt16LE(20, 4)
    lh.writeUInt16LE(8, 8)
    lh.writeUInt16LE(dosTime, 10)
    lh.writeUInt16LE(dosDate, 12)
    lh.writeUInt32LE(crc, 14)
    lh.writeUInt32LE(body.length, 18)
    lh.writeUInt32LE(e.data.length, 22)
    lh.writeUInt16LE(nameBuf.length, 26)
    chunks.push(lh, nameBuf, body)
    const ch = Buffer.alloc(46)
    ch.writeUInt32LE(0x02014b50, 0)
    ch.writeUInt16LE(20, 4)
    ch.writeUInt16LE(20, 6)
    ch.writeUInt16LE(8, 10)
    ch.writeUInt16LE(dosTime, 12)
    ch.writeUInt16LE(dosDate, 14)
    ch.writeUInt32LE(crc, 16)
    ch.writeUInt32LE(body.length, 20)
    ch.writeUInt32LE(e.data.length, 24)
    ch.writeUInt16LE(nameBuf.length, 28)
    ch.writeUInt32LE(offset, 42)
    central.push(Buffer.concat([ch, nameBuf]))
    offset += 30 + nameBuf.length + body.length
  }
  const cd = Buffer.concat(central)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(items.length, 8)
  eocd.writeUInt16LE(items.length, 10)
  eocd.writeUInt32LE(cd.length, 12)
  eocd.writeUInt32LE(offset, 16)
  return Buffer.concat([...chunks, cd, eocd])
}

// ---------- 生成并自校验 ----------
fs.mkdirSync(distDir, { recursive: true })
fs.rmSync(outZip, { force: true })
fs.writeFileSync(outZip, buildZip(entries))
const rootNames = [...new Set(entries.map((e) => e.name.split('/')[0]))]
if (!rootNames.includes('Dockerfile')) throw new Error('Dockerfile 未位于 zip 根目录，中止！')
console.log('==> 产物:', outZip, `(${(fs.statSync(outZip).size / 1024).toFixed(1)} KB, ${entries.length} 个文件)`)
console.log('    zip 根目录:', rootNames.join(', '))
console.log('[OK] 上传：微信云托管控制台 → 服务 → 新建版本 → 代码包上传 → 选择本 zip，监听端口填 8080')
