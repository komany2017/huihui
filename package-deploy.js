// Node.js 打包脚本：替代 package.ps1（绕开 PowerShell 文件系统异常）
// 产物：server/dist/ruanquan-win-deploy.zip（含 mysql2 依赖）
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const { execSync } = require('child_process')

// 命令行参数：--with-mysql 打入 mysql2 依赖；--push-data 连同 db.json 打包；--out-name 指定产物名
const args = process.argv.slice(2)
const WITH_MYSQL = args.includes('--with-mysql')
const PUSH_DATA = args.includes('--push-data')
const outNameIdx = args.indexOf('--out-name')
const OUT_NAME = outNameIdx >= 0 && args[outNameIdx + 1] ? args[outNameIdx + 1] : 'ruanquan-win-deploy.zip'

const serverDir = path.join(__dirname, 'server')
const projectRoot = __dirname
const distDir = path.join(serverDir, 'dist')
const outZip = path.join(distDir, OUT_NAME)

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
  console.log('  +', path.relative(path.dirname(stage), dest))
}
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name)
    const d = path.join(dest, entry.name)
    if (entry.isDirectory()) copyDir(s, d)
    else copyFile(s, d)
  }
}

// ---------- 1. 组装 stage ----------
const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
const stage = path.join(require('os').tmpdir(), `ruanquan-win-${stamp}`)
fs.rmSync(stage, { recursive: true, force: true })
const appDir = path.join(stage, 'app')
fs.mkdirSync(appDir, { recursive: true })
console.log('==> 组装 stage:', stage)

for (const f of ['index.js', 'store.js', 'db.js', 'seed.js']) copyFile(path.join(serverDir, f), path.join(appDir, f))
copyDir(path.join(serverDir, 'admin'), path.join(appDir, 'admin'))
for (const f of ['services.ts', 'products.ts', 'diseases.ts', 'acupoints.ts']) {
  copyFile(path.join(projectRoot, 'src', 'data', f), path.join(appDir, 'src-data', f))
}
for (const f of ['install.bat', 'install.ps1', 'manage.bat', 'manage.ps1']) copyFile(path.join(serverDir, f), path.join(stage, f))

// 可选：连同本地数据 db.json 一起打包（服务器将自动迁移入库）
if (PUSH_DATA) {
  copyFile(path.join(serverDir, 'data', 'db.json'), path.join(appDir, 'db.json'))
  console.log('[OK] 已包含本地数据 db.json')
}

// ---------- 2. 打包 mysql2 依赖 ----------
if (WITH_MYSQL) {
  console.log('==> npm install mysql2')
  let ok = false
  for (const registry of ['', '--registry=https://registry.npmmirror.com']) {
    try {
      execSync(`npm install mysql2 --prefix "${appDir}" --no-audit --no-fund --loglevel=error ${registry}`.trim(), { stdio: 'inherit', shell: 'cmd.exe' })
      ok = true
      break
    } catch (e) {
      console.log('[!] npm install 失败，尝试下一个源:', e.message.split('\n')[0])
    }
  }
  if (ok) console.log('[OK] mysql2 已打入部署包（服务器无需 npm）')
  else console.log('[!] mysql2 打包失败：服务器可稍后自行 npm install mysql2，或改用 JSON 存储')
}

// ---------- 3. ZIP 打包（POSIX 正斜杠条目，deflate）----------
console.log('==> 生成压缩包')
fs.mkdirSync(distDir, { recursive: true })
// 清理 dist 下的历史残留（只保留 zip 产物）
for (const name of fs.readdirSync(distDir)) {
  if (name !== OUT_NAME) {
    fs.rmSync(path.join(distDir, name), { recursive: true, force: true })
    console.log('  清理残留:', name)
  }
}
if (fs.existsSync(outZip)) fs.unlinkSync(outZip)

// CRC32
const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()
function crc32(buf) {
  let c = 0 ^ -1
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xff]
  return (c ^ -1) >>> 0
}

const entries = []
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) walk(full)
    else entries.push(full)
  }
}
walk(stage)

const chunks = []
const central = []
let offset = 0
for (const file of entries) {
  const rel = path.relative(stage, file).replace(/\\/g, '/')
  const nameBuf = Buffer.from(rel, 'utf8')
  const data = fs.readFileSync(file)
  const deflated = zlib.deflateRawSync(data, { level: 9 })
  const useDeflate = deflated.length < data.length
  const payload = useDeflate ? deflated : data
  const method = useDeflate ? 8 : 0
  const crc = crc32(data)

  const local = Buffer.alloc(30)
  local.writeUInt32LE(0x04034b50, 0)
  local.writeUInt16LE(20, 4)          // version
  local.writeUInt16LE(0x0800, 6)      // flags: UTF-8
  local.writeUInt16LE(method, 8)
  local.writeUInt16LE(0, 10)          // time
  local.writeUInt16LE(0x5221, 12)     // date (固定值即可)
  local.writeUInt32LE(crc, 14)
  local.writeUInt32LE(payload.length, 18)
  local.writeUInt32LE(data.length, 22)
  local.writeUInt16LE(nameBuf.length, 26)
  local.writeUInt16LE(0, 28)
  chunks.push(local, nameBuf, payload)

  const cd = Buffer.alloc(46)
  cd.writeUInt32LE(0x02014b50, 0)
  cd.writeUInt16LE(20, 4)
  cd.writeUInt16LE(20, 6)
  cd.writeUInt16LE(0x0800, 8)
  cd.writeUInt16LE(method, 10)
  cd.writeUInt16LE(0, 12)
  cd.writeUInt16LE(0x5221, 14)
  cd.writeUInt32LE(crc, 16)
  cd.writeUInt32LE(payload.length, 20)
  cd.writeUInt32LE(data.length, 24)
  cd.writeUInt16LE(nameBuf.length, 28)
  cd.writeUInt32LE(offset, 42)
  central.push(Buffer.concat([cd, nameBuf]))

  offset += local.length + nameBuf.length + payload.length
  console.log('  zip +', rel)
}

const cdBuf = Buffer.concat(central)
const eocd = Buffer.alloc(22)
eocd.writeUInt32LE(0x06054b50, 0)
eocd.writeUInt16LE(entries.length, 8)
eocd.writeUInt16LE(entries.length, 10)
eocd.writeUInt32LE(cdBuf.length, 12)
eocd.writeUInt32LE(offset, 16)

fs.writeFileSync(outZip, Buffer.concat([...chunks, cdBuf, eocd]))
fs.rmSync(stage, { recursive: true, force: true })

const size = (fs.statSync(outZip).size / 1024 / 1024).toFixed(1)
console.log(`\n============================================`)
console.log(`[OK] 部署包: ${outZip} (${size} MB)`)
console.log(`============================================`)
