# ============================================
# 润泉养元后台 · 服务器环境自检脚本
# 运行方式：双击 check.bat，或
#   powershell -NoProfile -ExecutionPolicy Bypass -File check-env.ps1
# 无需管理员权限。把全部输出发回给开发者即可定位问题。
# ============================================
param(
  [int]$Port = 3000,
  [int]$MysqlPort = 3306
)
$ErrorActionPreference = 'Continue'
function H1($t) { Write-Host "`n======== $t ========" -ForegroundColor Yellow }
function Ok($t) { Write-Host "  [OK] $t" -ForegroundColor Green }
function Warn($t) { Write-Host "  [!] $t" -ForegroundColor Yellow }
function Bad($t) { Write-Host "  [X] $t" -ForegroundColor Red }
function Info($t) { Write-Host "  -   $t" -ForegroundColor Gray }

$root = $PSScriptRoot
$problems = 0
function Mark($bad) { if ($bad) { $script:problems++ } }

# ---------- 1. 系统 ----------
H1 '系统环境'
Info ("计算机: $env:COMPUTERNAME  系统: " + [Environment]::OSVersion.VersionString)
Info ("PowerShell 版本: " + $PSVersionTable.PSVersion)
$id = [Security.Principal.WindowsIdentity]::GetCurrent()
$isAdmin = (New-Object Security.Principal.WindowsPrincipal($id)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($isAdmin) { Ok '当前是管理员权限（防火墙/自启可自动配置）' } else { Warn '当前非管理员（install.bat 双击会自动提权；部分检查项受限）' }
Info ("执行策略: " + (Get-ExecutionPolicy))

# ---------- 2. 解压完整性 + BOM ----------
H1 '部署包完整性（当前目录）'
$need = @('install.bat', 'install.ps1', 'manage.bat', 'manage.ps1', 'app\index.js', 'app\store.js', 'app\db.js')
foreach ($f in $need) {
  $p = Join-Path $root $f
  if (Test-Path $p) { Ok "$f 存在 ($([math]::Round((Get-Item $p).Length/1KB,1)) KB)" } else { Bad "$f 缺失！部署包解压不完整"; Mark $true }
}
$m2 = Join-Path $root 'app\node_modules\mysql2\package.json'
if (Test-Path $m2) { Ok 'mysql2 驱动已包含（支持 MySQL 存储）' } else { Warn 'mysql2 未包含（将回退 JSON 文件存储）' }
foreach ($f in @('install.ps1', 'manage.ps1')) {
  $p = Join-Path $root $f
  if (Test-Path $p) {
    $b = [IO.File]::ReadAllBytes($p)
    $n = 0
    while ($n + 2 -lt $b.Length -and $b[$n] -eq 239 -and $b[$n+1] -eq 187 -and $b[$n+2] -eq 191) { $n += 3 }
    if (($n / 3) -le 1) { Ok "$f BOM 正常 ($($n/3) 个)" } else { Bad "$f BOM 堆叠 $($n/3) 个！请重新解压最新部署包"; Mark $true }
  }
}

# ---------- 3. Node.js ----------
H1 'Node.js 运行时'
$nodeExe = $null
$rtNode = Join-Path $root 'runtime\node.exe'
$sysNode = Get-Command node.exe -ErrorAction SilentlyContinue
if (Test-Path $rtNode) { $nodeExe = $rtNode; Ok "便携版 runtime\node.exe" }
elseif ($sysNode) { $nodeExe = $sysNode.Source; Ok "系统已安装: $($sysNode.Source)" }
else { Warn '未找到 Node（安装脚本会自动下载 npmmirror 镜像；服务器断外网时需手动放置 runtime 目录）' }
if ($nodeExe) { Info ("版本: " + (& $nodeExe -v 2>$null)) }

# ---------- 4. 端口 ----------
H1 "端口 $Port"
$conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($conn) {
  $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
  if ($proc -and $proc.ProcessName -eq 'node') {
    Ok "端口 $Port 由本应用 node 进程监听（PID $($proc.Id)）"
    try {
      $r = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/api/health" -UseBasicParsing -TimeoutSec 3
      $st = ($r.Content | ConvertFrom-Json).data.storage
      Ok ("健康检查通过, 存储: " + $st.detail + $(if ($st.fallback) { '  [!] 注意: 处于回退存储状态' }))
    } catch { Warn "健康检查失败: $($_.Exception.Message)"; Mark $true }
  } else {
    Bad "端口 $Port 被其他程序占用: $($proc.ProcessName) (PID $($proc.Id))"; Mark $true
  }
} else { Info "端口 $Port 空闲（服务未启动）" }

# ---------- 5. MySQL ----------
H1 "MySQL 连通性（端口 $MysqlPort 及 3307）"
foreach ($mp in @($MysqlPort, 3307) | Select-Object -Unique) {
  $cli = New-Object Net.Sockets.TcpClient
  try {
    $ar = $cli.BeginConnect('127.0.0.1', $mp, $null, $null)
    if ($ar.AsyncWaitHandle.WaitOne(2000) -and $cli.Connected) {
      Ok "本机 127.0.0.1:$mp 可连通（MySQL 监听中）"
    } else { Info "本机 127.0.0.1:$mp 不可达" }
  } catch { Info "本机 127.0.0.1:$mp 不可达" } finally { $cli.Close() }
}
$myHost = ''
if (Test-Path (Join-Path $root 'run.bat')) {
  $rb = Get-Content (Join-Path $root 'run.bat') -ErrorAction SilentlyContinue | Where-Object { $_ -match '^set MYSQL_HOST=' } | Select-Object -First 1
  if ($rb) { $myHost = ($rb -replace '^set MYSQL_HOST=', '').Trim(); Info ("已安装配置的 MySQL 主机: $myHost") }
}

# ---------- 6. 已安装状态 ----------
H1 '安装状态'
$ij = Join-Path $root 'installed.json'
if (Test-Path $ij) {
  Info ("installed.json: " + (Get-Content $ij -Raw -ErrorAction SilentlyContinue).Trim() )
} else { Info '未安装（目录下无 installed.json）' }
$t = schtasks /Query /TN 'RuanquanAPI' /FO LIST 2>$null
if ($t -match 'Status:') { Ok '自启任务 RuanquanAPI 已注册' } else { Info '自启任务未注册（非管理员安装或未安装）' }
$fw = netsh advfirewall firewall show rule name="Ruanquan API" 2>$null
if ($fw -match 'Rule Name') { Ok '防火墙放行规则已存在' } else { Info '防火墙规则不存在（管理员安装时会自动添加）' }

# ---------- 汇总 ----------
H1 '诊断汇总'
if ($problems -eq 0) { Write-Host '  未发现明显问题。如仍失败，请把本页全部输出发给开发者。' -ForegroundColor Green }
else { Write-Host ("  发现 $problems 个问题（见上方 [X] 行）。把本页全部输出发给开发者。") -ForegroundColor Red }
Write-Host ''
