# reload-node.ps1 - wacs 续期后自动重启 Node.js 服务以加载新证书
# 由 setup-ssl.ps1 通过 wacs --installation script 调用
# wacs 会传 "create <renewal-id> <identifer> <record-name> <token>"，本脚本忽略
param([Parameter(ValueFromRemainingArguments=$true)][string[]]$WacsArgs)

$ErrorActionPreference = 'Continue'
$root = $PSScriptRoot
$installPs1 = Join-Path $root 'install.ps1'
$installedJson = Join-Path $root 'installed.json'
$logFile = Join-Path (Join-Path $root 'logs') 'reload-node.log'

function Log($m) {
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $m"
  Write-Host $line
  try { Add-Content -Path $logFile -Value $line -Encoding UTF8 -ErrorAction SilentlyContinue } catch {}
}

if (-not (Test-Path $installPs1)) { Log "[X] 未找到 install.ps1: $installPs1"; exit 1 }

# 读 installed.json 拿真实端口与 noService 标记（避免硬编码 3000）
$port = 3000
$noService = $false
if (Test-Path $installedJson) {
  try {
    $info = Get-Content $installedJson -Raw | ConvertFrom-Json
    if ($info.port) { $port = [int]$info.port }
    if ($info.noService) { $noService = [bool]$info.noService }
    Log "从 installed.json 读取: port=$port noService=$noService"
  } catch { Log "[!] 解析 installed.json 失败，回退默认 port=$port: $_" }
} else { Log "[!] 未找到 installed.json，使用默认 port=$port" }

# 委托给 install.ps1 的 restart 动作（已封装 Stop-App + Start-App + 健康检查）
Log "==> 触发 install.ps1 -Action restart"
$restartArgs = @('-Action', 'restart', '-Port', $port)
if ($noService) { $restartArgs += '-NoService' }
& $installPs1 @restartArgs
$exit = $LASTEXITCODE
Log "install.ps1 退出码: $exit"
exit $exit