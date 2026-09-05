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
# 80 端口时对外 URL 不带 :80 后缀
$portSuffix = if ($Port -eq 80) { '' } else { ":$Port" }
$root = $PSScriptRoot
$appDir = Join-Path $root 'app'
$logsDir = Join-Path $root 'logs'
$runBat = Join-Path $root 'run.bat'
$installedJson = Join-Path $root 'installed.json'
if (-not (Test-Path (Join-Path $appDir 'index.js'))) {
  Fail "未找到应用文件 app\index.js，请确认部署包已完整解压到: $root"
}

# ---------- 通用工具 ----------
function Test-IsAdmin {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  (New-Object Security.Principal.WindowsPrincipal($id)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}
# PS4/5.1 兼容：EAP=Stop 时原生命令 stderr 重定向会抛 NativeCommandError，此包装临时降级
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
  if (-not $NoService) { Run-Quiet { schtasks /End /TN $script:TaskName 2>$null | Out-Null } }
  Get-AppNodeProcess | ForEach-Object {
    try { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } catch {}
  }
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
  for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Health $Port) { $ok = $true; break }
  }
  return $ok
}

# ---------- 动作分发（非 install 直接执行） ----------
if ($Action -ne 'install') {
  switch ($Action) {
    'start'   { if (Start-App) { Ok "服务已启动: http://localhost${portSuffix}/api/health" } else { Fail '启动失败，请查看日志: manage.bat logs' } }
    'stop'    { Stop-App; Ok '服务已停止' }
    'restart' { Stop-App; if (Start-App) { Ok '服务已重启' } else { Fail '重启失败，请查看日志' } }
    'status'  {
      $p = Get-AppNodeProcess
      if ($p) { Ok "服务运行中（PID $($p.ProcessId)）" } else { Warn '服务未运行' }
      if (Test-Health $Port) { Ok "健康检查通过: http://localhost${portSuffix}" } else { Warn "服务未响应（端口 $Port）" }
      if (-not $NoService) {
        $t = Run-Quiet { schtasks /Query /TN $script:TaskName /FO LIST 2>$null }
        if ($t -match 'Status:\s+Ready') { Ok "自启任务已注册（就绪）" }
        elseif ($t -match 'Status:\s+Running') { Ok "自启任务运行中" }
        else { Warn "未检测到自启任务" }
      }
    }
    'uninstall' {
      Stop-App
      if (-not $NoService) {
        Run-Quiet { schtasks /Delete /TN $script:TaskName /F 2>$null | Out-Null }
        Run-Quiet { netsh advfirewall firewall delete rule name="$script:FwRuleName" 2>$null | Out-Null }
      }
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
  if ($v) {
    $MysqlHost = $v
    $v = Read-Host "  MySQL 端口（回车默认 $MysqlPort）"; if ($v) { $MysqlPort = [int]$v }
    $v = Read-Host "  MySQL 用户名（回车默认 $MysqlUser）"; if ($v) { $MysqlUser = $v }
    # 密码密文输入（不回显）；空密码直接回车
    $sec = Read-Host -AsSecureString "  MySQL 密码（无密码直接回车）"
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
    $MysqlPass = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    $v = Read-Host "  数据库名（回车默认 $MysqlDb）"; if ($v) { $MysqlDb = $v }
  }
}

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

# ---------- 2.5 MySQL 连接预检（避免装完才发现回退 JSON） ----------
if ($MysqlHost) {
  Step 'MySQL 连接预检'
  if (-not (Test-Path (Join-Path $appDir 'node_modules\mysql2'))) {
    Warn '当前部署包未包含 mysql2 驱动（JSON 变体），无法预检；服务启动时将回退 JSON 存储'
    Warn '如需 MySQL 存储，请改用 ruanquan-win-deploy-mysql.zip 重新安装'
  } else {
    $testJs = Join-Path $appDir '_mysql-preflight.js'
    $testJsContent = @'
const mysql = require('mysql2/promise');
(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.TH_HOST,
      port: Number(process.env.TH_PORT) || 3306,
      user: process.env.TH_USER,
      password: process.env.TH_PASS,
      connectTimeout: 8000
    });
    const db = (process.env.TH_DB || 'ruanquan').replace(/`/g, '');
    await conn.query('CREATE DATABASE IF NOT EXISTS `' + db + '` DEFAULT CHARACTER SET utf8mb4');
    await conn.end();
    console.log('OK');
  } catch (e) {
    console.log('ERR:' + (e.code || '') + ' ' + e.message);
    process.exit(1);
  }
})();
'@
    [System.IO.File]::WriteAllText($testJs, $testJsContent, (New-Object System.Text.UTF8Encoding($false)))
    $preflightOk = $false
    while (-not $preflightOk) {
      $env:TH_HOST = $MysqlHost; $env:TH_PORT = "$MysqlPort"; $env:TH_USER = $MysqlUser
      $env:TH_PASS = $MysqlPass; $env:TH_DB = $MysqlDb
      $out = $null
      $prevEap = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
      Push-Location $appDir
      try { $out = (& $NodeExe $testJs 2>&1 | Out-String) } finally { Pop-Location; $ErrorActionPreference = $prevEap }
      if ($LASTEXITCODE -eq 0 -and $out -match 'OK') {
        Ok "MySQL 连接成功（${MysqlUser}@${MysqlHost}:${MysqlPort}/${MysqlDb}，数据库已就绪）"
        $preflightOk = $true
      } else {
        $errLine = ($out -split "`r?`n" | Where-Object { $_ -match 'ERR:' } | Select-Object -First 1)
        if (-not $errLine) { $errLine = ($out -replace '\s+', ' ').Trim() }
        Warn "MySQL 连接失败: $errLine"
        $a = Read-Host "  [R]重新输入参数(默认)  [J]改用 JSON 文件存储继续  [Q]退出安装"
        switch -Regex ($a.ToUpper()) {
          '^J' { $MysqlHost = ''; Warn '已切换为 JSON 文件存储，本次安装继续'; $preflightOk = $true }
          '^Q' { Remove-Item $testJs -Force -ErrorAction SilentlyContinue; Fail '安装已取消' }
          default {
            $v = Read-Host "  MySQL 主机（回车保持 $MysqlHost）"; if ($v) { $MysqlHost = $v }
            $v = Read-Host "  端口（回车保持 $MysqlPort）"; if ($v) { $MysqlPort = [int]$v }
            $v = Read-Host "  用户名（回车保持 $MysqlUser）"; if ($v) { $MysqlUser = $v }
            $sec = Read-Host -AsSecureString "  密码（回车保持原密码；需修改请输入新密码）"
            $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
            $np = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
            if ($np) { $MysqlPass = $np }
            $v = Read-Host "  数据库名（回车保持 $MysqlDb）"; if ($v) { $MysqlDb = $v }
          }
        }
      }
    }
    Remove-Item $testJs -Force -ErrorAction SilentlyContinue
  }
}
$storage = if ($MysqlHost) { "MySQL @ ${MysqlHost}:${MysqlPort}/${MysqlDb}" } else { 'JSON 文件（app\data\db.json）' }
Write-Host "    最终配置 -> 端口: $Port | 存储: $storage | 账号: $AdminUser" -ForegroundColor Gray

# ---------- 3. 生成启动脚本 run.bat ----------
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

# 保存安装信息
$installed = @{ port = $Port; noService = [bool]$NoService; mysql = [bool]$MysqlHost; installedAt = (Get-Date).ToString('s') }
$installed | ConvertTo-Json -Depth 3 | Set-Content -Path $installedJson -Encoding UTF8
Ok "安装信息: $installedJson"

# ---------- 4. 防火墙 ----------
if (-not $NoService) {
  Step '配置防火墙'
  if (Test-IsAdmin) {
    Run-Quiet { netsh advfirewall firewall delete rule name="$script:FwRuleName" 2>$null | Out-Null }
    $fw = Run-Quiet { netsh advfirewall firewall add rule name="$script:FwRuleName" dir=in action=allow protocol=TCP localport=$Port profile=any 2>&1 }
    if ($LASTEXITCODE -eq 0) { Ok "防火墙已放行 TCP $Port（全部配置文件）" } else { Warn "防火墙配置失败: $fw" }
  } else {
    Warn '非管理员，跳过防火墙配置（请手动放行或重以管理员身份运行）'
  }
}

# ---------- 5. 开机自启任务计划 ----------
if (-not $NoService) {
  Step '注册开机自启'
  if (Test-IsAdmin) {
    Run-Quiet { schtasks /Delete /TN $script:TaskName /F 2>$null | Out-Null }
    $res = Run-Quiet { schtasks /Create /TN $script:TaskName /SC ONSTART /RU SYSTEM /TR "cmd /c `"$runBat`"" /F 2>&1 }
    if ($LASTEXITCODE -eq 0) { Ok "自启任务已注册（SYSTEM 账户，开机启动）" } else { Fail "注册任务失败: $res" }
  } else {
    Warn '非管理员，跳过自启注册（请手动以管理员身份运行 install.bat）'
  }
}

# ---------- 6. 启动并健康检查 ----------
Step '启动服务'
Stop-App
# 端口占用预检
$occupied = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
  Where-Object { (Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).ProcessName -ne 'node' }
if ($occupied) {
  $op = Get-Process -Id ($occupied | Select-Object -First 1).OwningProcess -ErrorAction SilentlyContinue
  Fail "端口 $Port 已被其他进程占用（$($op.ProcessName)，PID $($op.Id)）。请先停止该服务（如 IIS：net stop w3svc / 停用 Default Web Site），或改用 -Port 指定其他端口"
}
if (Start-App) {
  Ok "健康检查通过: http://localhost${portSuffix}/api/health"
  # 校验实际存储驱动与配置一致
  try {
    $resp = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/api/health" -UseBasicParsing -TimeoutSec 3
    $st = ($resp.Content | ConvertFrom-Json).data.storage
    if ($st) {
      if ($st.fallback) {
        Warn "存储回退：配置为 MySQL，但连接失败，实际使用 $($st.detail)（请检查 MySQL 服务与连接参数）"
      } else {
        Ok "实际存储: $($st.detail)"
      }
    }
  } catch {}
} else {
  Fail "启动失败，请查看日志: $($logsDir)\app.log"
}

# ---------- 完成 ----------
$ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
  Select-Object -First 1).IPAddress
Write-Host ''
Write-Host '============================================' -ForegroundColor Yellow
Write-Host '  润泉养元后台服务安装完成' -ForegroundColor Yellow
Write-Host "  管理后台:   http://localhost${portSuffix}/admin/"
Write-Host "  本机访问:   http://localhost${portSuffix}/admin/"
if ($ip) { Write-Host "  局域网访问: http://${ip}${portSuffix}/admin/" }
Write-Host "  管理账号:   $AdminUser / $AdminPass"
Write-Host "  存储模式:   $storage"
Write-Host '  日常管理:   manage.bat start|stop|restart|status|logs|uninstall'
Write-Host "  小程序端请把 src/config/api.ts 的 API_BASE_URL 改为 http://${ip}${portSuffix} 重新编译上传"
Write-Host "  外网访问:   请确认云服务器安全组已放行 TCP $Port（入站），即可用 http://<公网IP>${portSuffix}/ 访问"
Write-Host '============================================' -ForegroundColor Yellow
