# ============================================
# 润泉养元后台服务 · 一键部署脚本
# 用法示例：
#   powershell -ExecutionPolicy Bypass -File server/deploy.ps1 -ServerHost 1.2.3.4 -User root
#   常用参数也可用环境变量：DEPLOY_HOST / DEPLOY_USER / DEPLOY_SSH_PORT / DEPLOY_DIR / DEPLOY_APP_PORT
#   预演（不实际部署）：加 -DryRun
#   连同本地数据上传：加 -PushData（默认保留服务器已有数据）
# ============================================
param(
  [string]$ServerHost = $env:DEPLOY_HOST,
  [string]$User = $env:DEPLOY_USER,
  [int]$SshPort = 22,
  [string]$DeployDir = '/opt/ruanquan',
  [int]$AppPort = 3000,
  [switch]$PushData,
  [switch]$WithMysql,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

if ($env:DEPLOY_SSH_PORT) { $SshPort = [int]$env:DEPLOY_SSH_PORT }
if ($env:DEPLOY_DIR) { $DeployDir = $env:DEPLOY_DIR }
if ($env:DEPLOY_APP_PORT) { $AppPort = [int]$env:DEPLOY_APP_PORT }

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Ok($msg) { Write-Host "    [OK] $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "    [!] $msg" -ForegroundColor Yellow }

# ---------- 1. 参数与本地工具检查 ----------
Step '检查参数与本地工具'
if (-not $ServerHost -or -not $User) {
  Write-Host '缺少服务器地址或用户名。用法示例：' -ForegroundColor Red
  Write-Host '  powershell -ExecutionPolicy Bypass -File server/deploy.ps1 -ServerHost 1.2.3.4 -User root' -ForegroundColor Red
  Write-Host '或先设置环境变量 DEPLOY_HOST / DEPLOY_USER 后再运行。' -ForegroundColor Red
  exit 1
}
foreach ($tool in @('ssh', 'scp', 'tar')) {
  if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
    Write-Host "本机未找到 $tool（Windows 10 以上通常自带 OpenSSH 客户端）" -ForegroundColor Red
    exit 1
  }
}
Ok "目标: $User@$ServerHost`:$SshPort -> $DeployDir (应用端口 $AppPort$(if ($DryRun) { '，预演模式' }))"

$serverDir = Join-Path $PSScriptRoot 'server'
if (-not (Test-Path (Join-Path $serverDir 'index.js'))) { $serverDir = $PSScriptRoot }
$projectRoot = Split-Path $serverDir -Parent

# ---------- 2. 组装部署包（server 代码 + 种子源数据） ----------
Step '组装部署包'
$stamp = Get-Date -Format 'yyyyMMddHHmmss'
$stage = Join-Path $env:TEMP "ruanquan-deploy-$stamp"
New-Item -ItemType Directory -Path $stage -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $stage 'src-data') -Force | Out-Null

foreach ($f in @('index.js', 'db.js', 'seed.js', 'verify-api.mjs')) {
  Copy-Item (Join-Path $serverDir $f) $stage -Force
}
Copy-Item (Join-Path $serverDir 'admin') (Join-Path $stage 'admin') -Recurse -Force
# 种子源数据：供服务器首次启动自动建库（seed.js 会优先读本地 src-data）
foreach ($f in @('services.ts', 'products.ts', 'diseases.ts', 'acupoints.ts')) {
  Copy-Item (Join-Path $projectRoot "src/data/$f") (Join-Path $stage 'src-data') -Force
}
if ($PushData) { Copy-Item (Join-Path $serverDir 'data/db.json') $stage -Force }
if ($WithMysql) {
  Step '打包 MySQL 依赖（mysql2）'
  npm install mysql2 --prefix $stage --no-audit --no-fund --loglevel=error
  if ($LASTEXITCODE -ne 0) {
    npm install mysql2 --prefix $stage --no-audit --no-fund --loglevel=error --registry=https://registry.npmmirror.com
  }
  if ($LASTEXITCODE -eq 0) { Ok 'mysql2 已打入部署包' }
  else { Warn 'mysql2 打包失败：服务器将回退 JSON 文件存储（可稍后在服务器上 npm install mysql2）' }
}

$tgz = Join-Path $env:TEMP 'ruanquan-deploy.tgz'
if (Test-Path $tgz) { Remove-Item $tgz -Force }
tar -czf $tgz -C $stage . | Out-Null
$size = '{0:N1} KB' -f ((Get-Item $tgz).Length / 1KB)
Ok "部署包已生成: $tgz ($size)"

# ---------- 3. 生成远程执行脚本 ----------
$pushFlag = if ($PushData) { '1' } else { '0' }
$remoteSh = @'
set -e
cd "$DEPLOY_DIR"
mkdir -p data
if [ "$PUSH_DATA" = "1" ] && [ -f data/db.json ]; then
  cp data/db.json "data/db.json.bak-$(date +%Y%m%d%H%M%S)"
  echo "已备份服务器原数据"
fi
tar -xzf /tmp/ruanquan-deploy.tgz -C "$DEPLOY_DIR"
echo "文件解压完成"

if command -v pm2 >/dev/null 2>&1; then
  pm2 delete ruanquan-api >/dev/null 2>&1 || true
  PORT="$APP_PORT" pm2 start index.js --name ruanquan-api >/dev/null
  pm2 save >/dev/null 2>&1 || true
  echo "已通过 pm2 启动: ruanquan-api"
else
  if [ -f deploy.pid ]; then
    kill "$(cat deploy.pid)" >/dev/null 2>&1 || true
    sleep 1
  fi
  PORT="$APP_PORT" nohup node index.js > app.log 2>&1 &
  echo $! > deploy.pid
  echo "已通过 nohup 启动 (PID $(cat deploy.pid))，建议安装 pm2 以便开机自启与日志管理"
fi

sleep 2
PORT="$APP_PORT" node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>r.json()).then(j=>{console.log('远程健康检查: '+JSON.stringify(j));process.exit(j&&j.code===0?0:1)}).catch(e=>{console.log('远程健康检查失败: '+e.message);process.exit(1)})"
'@
$remoteShFile = Join-Path $env:TEMP 'ruanquan-remote.sh'
[System.IO.File]::WriteAllText($remoteShFile, $remoteSh, (New-Object System.Text.UTF8Encoding($false)))
Ok '远程脚本已生成'

$sshBase = @('-p', "$SshPort", '-o', 'ConnectTimeout=10', '-o', 'StrictHostKeyChecking=accept-new', "$User@$ServerHost")
$envPrefix = "DEPLOY_DIR='$DeployDir' APP_PORT=$AppPort PUSH_DATA=$pushFlag"

if ($DryRun) {
  Step '预演模式：将执行以下命令（未实际连接）'
  Write-Host "  ssh $($sshBase -join ' ') `"node -v`""
  Write-Host "  ssh $($sshBase -join ' ') `"mkdir -p $DeployDir`""
  Write-Host "  scp -P $SshPort $tgz $User@$ServerHost`:/tmp/ruanquan-deploy.tgz"
  Write-Host "  ssh $($sshBase -join ' ') `"$envPrefix bash -s`" < $remoteShFile"
  Write-Host "  curl http://${ServerHost}:$AppPort/api/health（部署后本机验证）"
  Remove-Item $stage -Recurse -Force
  Ok '预演结束（部署包保留在 TEMP，便于检查）'
  exit 0
}

# ---------- 4. 连通性与远程环境检查 ----------
Step "连接服务器并检查远程环境 ($User@$ServerHost)"
ssh @sshBase 'node -v' 2>$null
if ($LASTEXITCODE -ne 0) {
  Warn '无法获取远程 node 版本（未安装或不可用）'
  Write-Host '请先在服务器安装 Node.js 18+，例如：' -ForegroundColor Red
  Write-Host '  Ubuntu/Debian: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs' -ForegroundColor Red
  Write-Host '  CentOS/RHEL:   curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash - && sudo yum install -y nodejs' -ForegroundColor Red
  exit 1
}
ssh @sshBase "mkdir -p '$DeployDir'"
if ($LASTEXITCODE -ne 0) { Write-Host '远程目录创建失败（检查权限）' -ForegroundColor Red; exit 1 }
Ok '远程环境就绪'

# ---------- 5. 上传与远程部署 ----------
Step '上传部署包'
scp @('-P', "$SshPort", '-o', 'ConnectTimeout=10') $tgz "${User}@${ServerHost}:/tmp/ruanquan-deploy.tgz"
if ($LASTEXITCODE -ne 0) { Write-Host '上传失败（检查网络/SSH 端口）' -ForegroundColor Red; exit 1 }
Ok '上传完成'

Step '远程安装并重启服务'
Get-Content $remoteShFile -Raw | ssh @sshBase "$envPrefix bash -s"
if ($LASTEXITCODE -ne 0) { Write-Host '远程部署执行失败（可 ssh 登录后查看 app.log）' -ForegroundColor Red; exit 1 }

# ---------- 6. 本机验证公网可达性 ----------
Step '本机验证公网可达性（失败通常为云安全组未放行端口）'
curl.exe -s -m 6 -o NUL -w "GET http://${ServerHost}:$AppPort/api/health -> %{http_code}`n" "http://${ServerHost}:$AppPort/api/health"
if ($LASTEXITCODE -ne 0) { Warn "公网无法访问：请在云控制台安全组放行 TCP $AppPort 端口" }

# ---------- 7. 清理与总结 ----------
Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $tgz, $remoteShFile -Force -ErrorAction SilentlyContinue

Write-Host ''
Write-Host '==========================================' -ForegroundColor Green
Write-Host '  部署完成！' -ForegroundColor Green
Write-Host "  接口地址:   http://${ServerHost}:$AppPort/api/"
Write-Host "  管理后台:   http://${ServerHost}:$AppPort/admin/"
if ($WithMysql) {
  Write-Host "  MySQL:      服务器上设置 MYSQL_HOST/MYSQL_USER/MYSQL_PASS/MYSQL_DB 环境变量后重启即启用"
  Write-Host '              （首次启动自动建表，并从随包 db.json 迁移数据；未配置则回退 JSON 存储）'
}
Write-Host '  小程序配置: src/config/api.ts 的 API_BASE_URL 改为以上地址后重新上传小程序'
Write-Host '==========================================' -ForegroundColor Green
