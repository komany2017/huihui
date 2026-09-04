# ============================================
# 润泉养元后台服务 · 管理脚本（由 manage.bat 调用）
# 用法: manage.bat start|stop|restart|status|logs|uninstall
# ============================================
param([string]$Action = 'status')
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

# 读取安装信息（端口/模式），未安装时按默认处理
$port = 3000
$noService = $false
$infoFile = Join-Path $root 'installed.json'
if (Test-Path $infoFile) {
  $info = Get-Content $infoFile -Raw | ConvertFrom-Json
  if ($info.port) { $port = [int]$info.port }
  if ($info.noService) { $noService = $true }
}

$install = Join-Path $root 'install.ps1'
switch ($Action) {
  'logs' {
    $log = Join-Path $root 'logs\app.log'
    if (-not (Test-Path $log)) { Write-Host '暂无日志文件' -ForegroundColor Yellow; exit 0 }
    Write-Host "===== $log（最近 60 行）=====" -ForegroundColor Cyan
    Get-Content $log -Tail 60
    exit 0
  }
  'start'   { & $install -Action start -Port $port -NoService:$noService }
  'stop'    { & $install -Action stop -Port $port -NoService:$noService }
  'restart' { & $install -Action restart -Port $port -NoService:$noService }
  'status'  { & $install -Action status -Port $port -NoService:$noService }
  'uninstall' {
    & $install -Action uninstall -Port $port -NoService:$noService
    Remove-Item (Join-Path $root 'run.bat') -Force -ErrorAction SilentlyContinue
    Remove-Item $infoFile -Force -ErrorAction SilentlyContinue
  }
  default { Write-Host "用法: manage.bat start|stop|restart|status|logs|uninstall" -ForegroundColor Yellow; exit 1 }
}
