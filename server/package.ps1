# ============================================
# 润泉养元 · Windows Server（含 2012 R2）部署包打包脚本（在开发机运行）
# 用法：
#   powershell -ExecutionPolicy Bypass -File server/package.ps1
#   可选参数：
#     -WithMysql   打入 mysql2 依赖（服务器用 MySQL 存储时必须）
#     -PushData    连同本地 db.json 数据一起打包
#   产物：server/dist/ruanquan-win-deploy.zip
# ============================================
param(
  [switch]$WithMysql,
  [switch]$PushData,
  [string]$OutName = 'ruanquan-win-deploy.zip'
)
$ErrorActionPreference = 'Stop'
try { Add-Type -AssemblyName System.IO.Compression.FileSystem -ErrorAction SilentlyContinue } catch {}
function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Ok($msg) { Write-Host "    [OK] $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "    [!] $msg" -ForegroundColor Yellow }

# ---------- 路径定位（脚本位于 server/ 目录内） ----------
$serverDir = $PSScriptRoot                  # server
$projectRoot = Split-Path $serverDir -Parent
$distDir = Join-Path $serverDir 'dist'

Step '组装 Windows 部署包'
$stamp = Get-Date -Format 'yyyyMMddHHmmss'
$stage = Join-Path $env:TEMP "ruanquan-win-$stamp"
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
$appDir = Join-Path $stage 'app'
New-Item -ItemType Directory -Path $appDir -Force | Out-Null

# 后端代码（store.js 必须包含，index.js 依赖它）
foreach ($f in @('index.js', 'store.js', 'db.js', 'seed.js')) {
  Copy-Item (Join-Path $serverDir $f) $appDir -Force
}
Copy-Item (Join-Path $serverDir 'admin') (Join-Path $appDir 'admin') -Recurse -Force

# 种子源数据（服务器空库时自动建库用）
New-Item -ItemType Directory -Path (Join-Path $appDir 'src-data') -Force | Out-Null
foreach ($f in @('services.ts', 'products.ts', 'diseases.ts', 'acupoints.ts')) {
  Copy-Item (Join-Path $projectRoot "src/data/$f") (Join-Path $appDir 'src-data') -Force
}

if ($PushData) {
  Copy-Item (Join-Path $serverDir 'data/db.json') $appDir -Force
  Ok '已包含本地数据 db.json（服务器将自动迁移入库）'
}

# 安装/管理脚本随包
foreach ($f in @('install.bat', 'install.ps1', 'manage.bat', 'manage.ps1')) {
  Copy-Item (Join-Path $serverDir $f) $stage -Force
}

# ---------- 可选：MySQL 依赖 ----------
if ($WithMysql) {
  Step '打包 mysql2 依赖'
  $ok = $false
  foreach ($reg in @('', '--registry=https://registry.npmmirror.com')) {
    npm install mysql2 --prefix (Join-Path $stage 'app') --no-audit --no-fund --loglevel=error $reg 2>$null
    if ($LASTEXITCODE -eq 0) { $ok = $true; break }
  }
  if ($ok) { Ok 'mysql2 已打入部署包（服务器无需 npm）' }
  else { Warn 'mysql2 打包失败：服务器可稍后自行 npm install mysql2，或改用 JSON 存储' }
}

# ---------- 压缩 ----------
# 自定义打包：PS5.1 的 Compress-Archive 与 .NET ZipFile 都会写入反斜杠条目，
# 2012 R2（.NET 4.5）解压会失败、部分第三方工具会生成错误结构。
# 这里用 ZipArchive 逐文件写入，显式使用正斜杠条目（POSIX 风格，全平台兼容）。
function Compress-PosixZip([string]$StageDir, [string]$ZipPath) {
  Add-Type -AssemblyName System.IO.Compression -ErrorAction SilentlyContinue
  Add-Type -AssemblyName System.IO.Compression.FileSystem -ErrorAction SilentlyContinue
  if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
  $fs = [System.IO.File]::Open($ZipPath, [System.IO.FileMode]::CreateNew)
  $arc = New-Object System.IO.Compression.ZipArchive($fs, [System.IO.Compression.ZipArchiveMode]::Create)
  try {
    $files = Get-ChildItem -Path $StageDir -Recurse -File
    foreach ($f in $files) {
      $rel = $f.FullName.Substring($StageDir.Length + 1) -replace '\\', '/'
      $entry = $arc.CreateEntry($rel, [System.IO.Compression.CompressionLevel]::Optimal)
      $es = $entry.Open()
      $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
      $es.Write($bytes, 0, $bytes.Length)
      $es.Close()
    }
  } finally {
    $arc.Dispose()
    $fs.Dispose()
  }
}

Step '生成压缩包'
New-Item -ItemType Directory -Path $distDir -Force | Out-Null
$zip = Join-Path $distDir $OutName
Compress-PosixZip $stage $zip
Remove-Item $stage -Recurse -Force
$size = '{0:N1} MB' -f ((Get-Item $zip).Length / 1MB)
Ok "部署包: $zip ($size)"

Write-Host ''
Write-Host '============================================' -ForegroundColor Yellow
Write-Host '服务器上的安装步骤：' -ForegroundColor Yellow
Write-Host '  1. 把 ruanquan-win-deploy.zip 拷贝到 Windows Server（远程桌面复制/共享/上传均可）'
Write-Host '  2. 解压到任意目录，如 C:\ruanquan'
Write-Host '  3. 双击 install.bat（需要管理员权限），按提示输入配置'
Write-Host '  4. 安装完成自动启动，并注册开机自启任务'
Write-Host '  日常管理：双击 manage.bat 或命令行 manage.bat start|stop|restart|status|logs|uninstall'
Write-Host '============================================' -ForegroundColor Yellow
