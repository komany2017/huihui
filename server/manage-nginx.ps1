# ============================================
# 润泉养元 · Nginx 管理脚本（由 manage-nginx.bat 调用）
# 用法: manage-nginx.bat start|stop|restart|reload|status|test|logs|install-service|uninstall-service
# 需要管理员权限（start/stop/install-service 等操作）
# ============================================
param([string]$Action = 'status')
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$confFile = Join-Path $root 'nginx.conf'

function Write-Info($m) { Write-Host "    [OK] $m" -ForegroundColor Green }
function Write-Warn($m) { Write-Host "    [!] $m" -ForegroundColor Yellow }
function Write-Err($m)  { Write-Host "    [X] $m" -ForegroundColor Red }

# ---------- 管理员检查 ----------
$id = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($id)
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

# ---------- 定位 nginx.exe ----------
function Find-NginxExe {
  $pathExe = Get-Command nginx.exe -ErrorAction SilentlyContinue
  if ($pathExe) { return $pathExe.Source }
  $candidates = @(
    'C:\nginx\nginx.exe',
    'C:\Program Files\nginx\nginx.exe',
    'C:\Program Files (x86)\nginx\nginx.exe',
    'D:\nginx\nginx.exe',
    (Join-Path $root 'tools\nginx\nginx.exe')
  )
  foreach ($c in $candidates) {
    if (Test-Path $c) { return $c }
  }
  # winget 安装位置
  $wingetBase = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages'
  if (Test-Path $wingetBase) {
    $found = Get-ChildItem -Path $wingetBase -Filter 'nginx.exe' -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) { return $found.FullName }
  }
  return $null
}

$nginxExe = Find-NginxExe
if (-not $nginxExe) {
  Write-Err 'nginx.exe 未找到。请先运行 setup-nginx.ps1 安装 Nginx，或手动下载到 C:\nginx\'
  exit 1
}
$nginxDir = Split-Path $nginxExe -Parent

# 找日志目录
$logDir = Join-Path $nginxDir 'logs'
if (-not (Test-Path $logDir)) { $logDir = Join-Path $root 'logs' }

# 找实际使用的 conf（如本目录有就用本目录，否则用 Nginx 默认）
if (Test-Path $confFile) {
  $useConf = $confFile
} else {
  $useConf = Join-Path $nginxDir 'conf\nginx.conf'
  if (-not (Test-Path $useConf)) {
    Write-Err "未找到 nginx.conf（本目录或 $useConf）"
    exit 1
  }
}

# ---------- 操作分发 ----------
switch ($Action) {
  'test' {
    Write-Host "`n==> 测试 Nginx 配置" -ForegroundColor Cyan
    & $nginxExe -t -c $useConf
    if ($LASTEXITCODE -eq 0) { Write-Info '配置语法正确' } else { Write-Err '配置语法错误' }
  }
  'start' {
    if (-not $isAdmin) { Write-Err '需要管理员权限'; exit 1 }
    $proc = Get-Process nginx -ErrorAction SilentlyContinue
    if ($proc) { Write-Warn "Nginx 已在运行（PID: $($proc.Id -join ','))"; exit 0 }
    Write-Host "`n==> 启动 Nginx" -ForegroundColor Cyan
    Push-Location $nginxDir
    Start-Process -FilePath $nginxExe -ArgumentList '-c', $useConf -WindowStyle Hidden
    Start-Sleep -Milliseconds 500
    Pop-Location
    $proc = Get-Process nginx -ErrorAction SilentlyContinue
    if ($proc) { Write-Info "Nginx 已启动（PID: $($proc.Id -join ','))" }
    else { Write-Err '启动失败，请查看日志: ' + (Join-Path $logDir 'error.log') }
  }
  'stop' {
    if (-not $isAdmin) { Write-Err '需要管理员权限'; exit 1 }
    Write-Host "`n==> 停止 Nginx" -ForegroundColor Cyan
    & $nginxExe -s stop -c $useConf 2>&1 | Out-Null
    Start-Sleep -Milliseconds 500
    $proc = Get-Process nginx -ErrorAction SilentlyContinue
    if ($proc) {
      Write-Warn 'nginx -s stop 未生效，强制结束进程'
      $proc | Stop-Process -Force
      Write-Info '已强制结束'
    } else {
      Write-Info 'Nginx 已停止'
    }
  }
  'restart' {
    if (-not $isAdmin) { Write-Err '需要管理员权限'; exit 1 }
    Write-Host "`n==> 重启 Nginx" -ForegroundColor Cyan
    & $nginxExe -s stop -c $useConf 2>&1 | Out-Null
    Start-Sleep -Milliseconds 800
    Push-Location $nginxDir
    Start-Process -FilePath $nginxExe -ArgumentList '-c', $useConf -WindowStyle Hidden
    Start-Sleep -Milliseconds 500
    Pop-Location
    $proc = Get-Process nginx -ErrorAction SilentlyContinue
    if ($proc) { Write-Info "Nginx 已重启（PID: $($proc.Id -join ','))" }
    else { Write-Err '重启失败' }
  }
  'reload' {
    if (-not $isAdmin) { Write-Err '需要管理员权限'; exit 1 }
    Write-Host "`n==> 重载 Nginx 配置（不中断服务）" -ForegroundColor Cyan
    & $nginxExe -s reload -c $useConf 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { Write-Info '配置已重载' } else { Write-Err '重载失败' }
  }
  'status' {
    Write-Host "`n==> Nginx 状态" -ForegroundColor Cyan
    $proc = Get-Process nginx -ErrorAction SilentlyContinue
    if ($proc) {
      Write-Info "运行中（PID: $($proc.Id -join ',')，工作进程数: $($proc.Count))"
      $proc | Format-Table Id, Name, CPU, WorkingSet, StartTime -AutoSize
    } else {
      Write-Warn 'Nginx 未运行'
    }
    Write-Host "    配置文件: $useConf"
    Write-Host "    日志目录: $logDir"
    Write-Host "    端口监听:"
    $ports = @(80, 443)
    foreach ($p in $ports) {
      $listen = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
      $tag = if ($listen) { 'LISTEN' } else { '-' }
      Write-Host ("      {0,5} : {1}" -f $p, $tag)
    }
  }
  'logs' {
    $errLog = Join-Path $logDir 'error.log'
    $accLog = Join-Path $logDir 'access.log'
    Write-Host "`n===== error.log（最近 40 行）=====" -ForegroundColor Cyan
    if (Test-Path $errLog) { Get-Content $errLog -Tail 40 -Encoding UTF8 } else { Write-Warn "无 $errLog" }
    Write-Host "`n===== access.log（最近 20 行）=====" -ForegroundColor Cyan
    if (Test-Path $accLog) { Get-Content $accLog -Tail 20 -Encoding UTF8 } else { Write-Warn "无 $accLog" }
  }
  'install-service' {
    if (-not $isAdmin) { Write-Err '需要管理员权限'; exit 1 }
    $svcName = 'RuanquanNginx'
    $existing = Get-Service -Name $svcName -ErrorAction SilentlyContinue
    if ($existing) { Write-Warn "服务已存在: $svcName"; exit 0 }
    # 用 sc 创建（依赖 Nginx 自身能以服务方式运行；推荐用 nssm 兜底）
    $nssm = Get-Command nssm.exe -ErrorAction SilentlyContinue
    if ($nssm) {
      & $nssm.Source install $svcName $nginxExe '-c ' + $useConf
      & $nssm.Source set $svcName AppDirectory $nginxDir
      & $nssm.Source start $svcName
      Write-Info "已通过 nssm 安装并启动服务: $svcName"
    } else {
      # 用 sc 创建（Nginx 原生不支持服务模式，可能启动失败，建议装 nssm）
      $args = 'create {0} binPath= "{1} -c {2}" start= auto' -f $svcName, $nginxExe, $useConf
      cmd /c "sc $args" 2>&1 | Out-Null
      Write-Info "服务已创建: $svcName"
      Write-Warn '注意：Nginx 原生不支持 Windows 服务模式，建议安装 nssm 后重装'
      Write-Warn '  下载 nssm: https://nssm.cc/dl/nssm-2.24.zip'
      Write-Warn '  然后跑: manage-nginx.bat uninstall-service 再 install-service'
    }
  }
  'uninstall-service' {
    if (-not $isAdmin) { Write-Err '需要管理员权限'; exit 1 }
    $svcName = 'RuanquanNginx'
    $existing = Get-Service -Name $svcName -ErrorAction SilentlyContinue
    if (-not $existing) { Write-Warn "服务不存在: $svcName"; exit 0 }
    if ($existing.Status -eq 'Running') {
      Stop-Service $svcName -Force
      Write-Info '服务已停止'
    }
    sc.exe delete $svcName 2>&1 | Out-Null
    Write-Info "服务已删除: $svcName"
  }
  default {
    Write-Host '用法: manage-nginx.bat start|stop|restart|reload|status|test|logs|install-service|uninstall-service' -ForegroundColor Yellow
    exit 1
  }
}
