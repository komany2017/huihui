# ============================================
# 润泉养元后台服务 · Windows Server 安装脚本
# 由 install.bat 调用（管理员权限），也可直接运行：
#   powershell -ExecutionPolicy Bypass -File install.ps1 -Port 3000 -AdminPass xxx
#   交互安装：install.bat          仅测试不装服务：加 -NoService
#   其他动作：-Action start|stop|restart|status|uninstall
# ============================================
param(
  [string]$Action = 'install',
  [int]$Port = 3000,
  [string]$AdminUser = 'admin',
  [string]$AdminPass = '',
  [string]$MysqlHost = '',
  [int]$MysqlPort = 3306,
  [string]$MysqlUser = 'root',
  [string]$MysqlPass = '',
  [string]$MysqlDb = 'ruanquan',
  [string]$NodeExe = '',
  [string]$NodeVersion = 'v16.20.2',
  [switch]$NoService
)
$ErrorActionPreference = 'Stop'
# 兼容 Windows Server 2012 R2（PowerShell 4.0，无 Expand-Archive）：加载 .NET zip 组件
try { Add-Type -AssemblyName System.IO.Compression.FileSystem -ErrorAction SilentlyContinue } catch {}
function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Ok($msg) { Write-Host "    [OK] $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "    [!] $msg" -ForegroundColor Yellow }
function Fail($msg) { Write-Host "    [X] $msg" -ForegroundColor Red; exit 1 }

$script:TaskName = 'RuanquanAPI'
$script:FwRuleName = 'Ruanquan API'
$root = $PSScriptRoot
$appDir = Join-Path $root 'app'
$logsDir = Join-Path $root 'logs'
$runBat = Join-Path $root 'run.bat'
if (-not (Test-Path (Join-Path $appDir 'index.js'))) {
  Fail "未找到应用文件 app\index.js，请确认部署包已完整解压到: $root"
}

# ---------- 通用工具 ----------
function Test-IsAdmin {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  (New-Object Security.Principal.WindowsPrincipal($id)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}
# PS4/5.1 兼容：$ErrorActionPreference='Stop' 时，原生命令 stderr 一旦被重定向（2>$null/2>&1）
# 会抛出 NativeCommandError 终止脚本。此包装临时降级为 Continue，保证"目标不存在"类静默跳过。
function Run-Quiet([scriptblock]$sb) {
  $eap = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try { & $sb } finally { $ErrorActionPreference = $eap }
}
function Test-Health([int]$p) {
  try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:$p/api/health" -UseBasicParsing -TimeoutSec 3
    return ($r.StatusCode -eq 200)
  } catch { return $false }
}
function Get-AppNodeProcess {
  Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match 'index\.js' -and $_.CommandLine -match [regex]::Escape($appDir) }
}
function Stop-App {
  if (-not $NoService) { schtasks /End /TN $script:TaskName 2>$null | Out-Null }
  Get-AppNodeProcess | ForEach-Object {
    try { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } catch {}
  }
  # 兜底：按监听端口找到 node 进程并结束（只杀 node.exe，避免误伤）
  try {
    Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
      Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object {
        $proc = Get-Process -Id $_ -ErrorAction SilentlyContinue
        if ($proc -and $proc.ProcessName -eq 'node') { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
      }
  } catch {}
  Start-Sleep -Seconds 1
}
function Start-App {
  if ($NoService) {
    Start-Process -FilePath 'cmd.exe' -ArgumentList "/c", "`"$runBat`"" -WindowStyle Hidden
  } else {
    schtasks /Run /TN $script:TaskName | Out-Null
  }
  $ok = $false
  for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Health $Port) { $ok = $true; break }
  }
  return $ok
}

# ---------- 动作分发 ----------
if ($Action -ne 'install') {
  switch ($Action) {
    'start'   { if (Start-App) { Ok "服务已启动: http://localhost:$Port/api/health" } else { Fail '启动失败，请查看日志: manage.bat logs' } }
    'stop'    { Stop-App; Ok '服务已停止' }
    'restart' { Stop-App; if (Start-App) { Ok '服务已重启' } else { Fail '重启失败，请查看日志' } }
    'status' {
      $svc = if ($NoService) { '（未注册系统服务，-NoService 模式）' } else { (schtasks /Query /TN $script:TaskName 2>$null | Select-Object -Last 2 | Out-String).Trim() }
      Write-Host $svc
      if (Test-Health $Port) { Ok "健康检查通过: http://localhost:$Port" } else { Warn "服务未响应（端口 $Port）" }
    }
    'uninstall' {
      Stop-App
      if (-not $NoService) { schtasks /Delete /TN $script:TaskName /F 2>$null | Out-Null; Ok '已删除开机自启任务' }
      if (Test-IsAdmin) { netsh advfirewall firewall delete rule name="$script:FwRuleName" 2>$null | Out-Null; Ok '已删除防火墙放行规则' }
      Ok '服务已卸载（应用文件保留，如需彻底清理请手动删除目录）'
    }
    default { Fail "未知动作: $Action（可用: install/start/stop/restart/status/uninstall）" }
  }
  exit 0
}

# ---------- 1. 交互式补全配置 ----------
Step '安装配置'
if (-not $AdminPass) {
  $v = Read-Host "管理后台密码（回车默认 admin123）"
  if ($v) { $AdminPass = $v } else { $AdminPass = 'admin123' }
}
if (-not $MysqlHost) {
  $v = Read-Host "MySQL 主机（回车=使用 JSON 文件存储；如 127.0.0.1 启用 MySQL）"
  if ($v) { $MysqlHost = $v }
}
$storage = if ($MysqlHost) { "MySQL @ ${MysqlHost}:${MysqlPort}/${MysqlDb}" } else { 'JSON 文件（app\data\db.json）' }
Write-Host "    端口: $Port | 存储: $storage | 账号: $AdminUser" -ForegroundColor Gray

# ---------- 2. Node.js 运行时 ----------
Step '检查 Node.js 运行时'
$nodeCmd = Get-Command node.exe -ErrorAction SilentlyContinue
$runtimeDir = Join-Path $root 'runtime'
$runtimeNode = Join-Path $runtimeDir 'node.exe'
$nodeSource = ''
if ($NodeExe -and (Test-Path $NodeExe)) { $nodeSource = '参数指定' }
elseif (Test-Path $runtimeNode) { $NodeExe = $runtimeNode; $nodeSource = '便携版 runtime\' }
elseif ($nodeCmd) { $NodeExe = $nodeCmd.Source; $nodeSource = '系统已安装' }

if (-not $nodeSource) {
  # 查找随包/本地已有的 node zip
  $zip = Get-ChildItem -Path $root, (Join-Path $root 'runtime') -Filter 'node-*-win-x64.zip' -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $zip) {
    if (-not $NoService -and -not (Test-IsAdmin)) { Fail '请以管理员身份运行 install.bat（需要注册系统服务与防火墙规则）' }
    $ver = $NodeVersion
    $urls = @(
      "https://cdn.npmmirror.com/binaries/node/$ver/node-$ver-win-x64.zip",
      "https://mirrors.huaweicloud.com/nodejs/$ver/node-$ver-win-x64.zip",
      "https://nodejs.org/dist/$ver/node-$ver-win-x64.zip"
    )
    New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
    $zipPath = Join-Path $runtimeDir "node-$ver-win-x64.zip"
    foreach ($u in $urls) {
      try {
        Write-Host "    下载 Node.js $ver : $u" -ForegroundColor Gray
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $u -OutFile $zipPath -UseBasicParsing -TimeoutSec 300
        if ((Get-Item $zipPath).Length -gt 5MB) { $zip = Get-Item $zipPath; break }
      } catch { Warn "下载失败: $($_.Exception.Message)" }
    }
  }
  if ($zip) {
    Write-Host "    解压 Node.js ..." -ForegroundColor Gray
    $tmp = Join-Path $runtimeDir '_tmp'
    if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
    # PS4 无 Expand-Archive，使用 .NET ZipFile（2012 R2 兼容）
    [System.IO.Compression.ZipFile]::ExtractToDirectory($zip.FullName, $tmp)
    $found = Get-ChildItem -Path $tmp -Recurse -Filter 'node.exe' | Select-Object -First 1
    if ($found) {
      # 把 node.exe 所在目录内容上移到 runtime\（避免删除 _tmp 时连带丢失 node.exe）
      $nodeHome = $found.Directory.FullName
      if ($nodeHome -ne $runtimeDir) {
        Get-ChildItem -Path $nodeHome -Force | Move-Item -Destination $runtimeDir -Force
      }
      Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
      $NodeExe = Join-Path $runtimeDir 'node.exe'
      $nodeSource = '便携版（自动下载）'
      Ok "Node 就绪: $NodeExe"
    }
  }
  if (-not $nodeSource) {
    Fail "未能获取 Node.js。请手动从 https://nodejs.org/zh-cn 下载 zip 版，放到 $root 下，重命名包含 node.exe 的目录为 runtime"
  }
} else { Ok "Node: $NodeExe ($nodeSource)" }

& $NodeExe -v | ForEach-Object { Ok "Node 版本: $_" }

# ---------- 3. 生成启动脚本 run.bat（含环境变量与日志重定向） ----------
Step '生成启动配置'
if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir -Force | Out-Null }
$envLines = New-Object System.Collections.Generic.List[string]
$envLines.Add("set PORT=$Port")
$envLines.Add("set ADMIN_USER=$AdminUser")
$envLines.Add("set ADMIN_PASS=$AdminPass")
if ($MysqlHost) {
  $envLines.Add("set MYSQL_HOST=$MysqlHost")
  $envLines.Add("set MYSQL_PORT=$MysqlPort")
  $envLines.Add("set MYSQL_USER=$MysqlUser")
  $envLines.Add("set MYSQL_PASS=$MysqlPass")
  $envLines.Add("set MYSQL_DB=$MysqlDb")
}
$envText = ($envLines -join "`r`n")
$runContent = "@echo off`r`ncd /d `"$appDir`"`r`n$envText`r`n`"$NodeExe`" `"$appDir\index.js`" >> `"$logsDir\app.log`" 2>&1`r`n"
[System.IO.File]::WriteAllText($runBat, $runContent, [System.Text.Encoding]::ASCII)
Ok "启动脚本: $runBat"

# 记录安装信息（manage.bat 管理时读取端口/模式）
$installed = @{ port = $Port; noService = [bool]$NoService; mysql = [bool]$MysqlHost; installedAt = (Get-Date).ToString('s') }
[System.IO.File]::WriteAllText((Join-Path $root 'installed.json'), ($installed | ConvertTo-Json), (New-Object System.Text.UTF8Encoding($false)))

# ---------- 4. 防火墙放行 ----------
if ((Test-IsAdmin)) {
  Step '配置防火墙放行'
  netsh advfirewall firewall delete rule name="$script:FwRuleName" >$null 2>&1
  netsh advfirewall firewall add rule name="$script:FwRuleName" dir=in action=allow protocol=TCP localport=$Port | Out-Null
  if ($LASTEXITCODE -eq 0) { Ok "已放行 TCP $Port（局域网/公网可访问）" } else { Warn '防火墙配置失败，请手动放行端口' }
} else {
  Warn '当前非管理员，跳过防火墙配置（-NoService 测试模式）'
}

# ---------- 5. 注册开机自启（任务计划程序，SYSTEM 账户） ----------
if ($NoService) {
  Warn '跳过系统服务注册（-NoService 测试模式）'
} else {
  if (-not (Test-IsAdmin)) { Fail '注册开机自启需要管理员权限，请右键 install.bat 选择"以管理员身份运行"' }
  Step '注册开机自启（任务计划程序）'
  Run-Quiet { schtasks /Delete /TN $script:TaskName /F 2>$null | Out-Null }
  $r = schtasks /Create /TN $script:TaskName /TR "`"$runBat`"" /SC ONSTART /RU SYSTEM /RL HIGHEST /F
  if ($LASTEXITCODE -ne 0) { Fail "任务计划注册失败: $r" }
  Ok "已注册任务 $script:TaskName（SYSTEM 账户，开机自动启动）"
}

# ---------- 6. 启动并健康检查 ----------
Step '启动服务'
Stop-App
if (Start-App) {
  Ok "健康检查通过: http://localhost:$Port/api/health"
} else {
  Fail "启动失败，请查看日志: $($logsDir)\app.log"
}

# ---------- 完成 ----------
Write-Host ''
Write-Host '============================================' -ForegroundColor Yellow
Write-Host '  润泉养元后台服务安装完成' -ForegroundColor Yellow
Write-Host "  本机访问:   http://localhost:$Port/admin/"
$ip = $null
try {
  $ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
    Select-Object -First 1).IPAddress
} catch {}
if (-not $ip) {
  # netstat 兜底解析本机 IPv4
  $ipRow = (ipconfig | Select-String 'IPv4').ToString() -replace '.*?:\s*', ''
  if ($ipRow) { $ip = $ipRow.Trim() }
}
if ($ip) { Write-Host "  局域网访问: http://${ip}:$Port/admin/" }
Write-Host "  管理账号:   $AdminUser / $AdminPass"
Write-Host "  存储模式:   $storage"
Write-Host '  日常管理:   manage.bat start|stop|restart|status|logs|uninstall'
Write-Host "  小程序端请把 src/config/api.ts 的 API_BASE_URL 改为 http://${ip}:$Port 重新编译上传"
Write-Host '============================================' -ForegroundColor Yellow
