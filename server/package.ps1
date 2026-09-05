# ============================================
# rongquan - Windows Server deploy package script (dev machine)
# Usage:
#   powershell -ExecutionPolicy Bypass -File server/package.ps1
#   Options:
#     -WithMysql   bundle mysql2 dependency (required for MySQL storage)
#     -PushData    bundle local db.json data
#     -OutName xxx output file name (default ruanquan-win-deploy.zip)
#   Output: server/dist/ruanquan-win-deploy.zip
# Note: actual packaging logic is in Node.js script package-deploy.js
# ============================================
param(
  [switch]$WithMysql,
  [switch]$PushData,
  [string]$OutName = 'ruanquan-win-deploy.zip'
)
$ErrorActionPreference = 'Stop'
if (-not $OutName) { $OutName = 'ruanquan-win-deploy.zip' }

$scriptDir = $PSScriptRoot
if (-not $scriptDir) { $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path }
$projectRoot = Split-Path $scriptDir -Parent
$nodeScript = Join-Path $projectRoot 'package-deploy.js'

if (-not (Test-Path $nodeScript)) {
  Write-Host '[ERROR] packaging script not found' -ForegroundColor Red
  exit 1
}

$nodeArgs = @($nodeScript)
if ($WithMysql) { $nodeArgs += '--with-mysql' }
if ($PushData) { $nodeArgs += '--push-data' }
$nodeArgs += @('--out-name', $OutName)

& node @nodeArgs
exit $LASTEXITCODE
