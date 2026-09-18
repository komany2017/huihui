param(
  [Parameter(Mandatory=$true)][string]$Domain,
  [Parameter(Mandatory=$true)][string]$Email,
  [string]$OutDir = '',
  [switch]$Renew
)
$ErrorActionPreference = 'Stop'
try { Add-Type -AssemblyName System.IO.Compression.FileSystem -ErrorAction SilentlyContinue } catch {}
function Step($m) { Write-Host "`n==> $m" -ForegroundColor Cyan }
function Ok($m)  { Write-Host "    [OK] $m" -ForegroundColor Green }
function Warn($m){ Write-Host "    [!] $m" -ForegroundColor Yellow }
function Fail($m){ Write-Host "    [X] $m" -ForegroundColor Red; exit 1 }

$root = $PSScriptRoot
$sslDir = if ($OutDir) { $OutDir } else { Join-Path $root 'ssl' }
$wacsDir = Join-Path $root 'tools\win-acme'
$wacsExe = Join-Path $wacsDir 'wacs.exe'
$acmeRoot = Join-Path $root '.well-known\acme-challenge'

# 管理员检查
$id = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($id)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Fail '请以管理员身份运行（admin shell）'
}

# ---------- 1. 下载/解压 win-acme ----------
if (-not (Test-Path $wacsExe)) {
  Step '下载 win-acme 最新版'
  New-Item -ItemType Directory -Path $wacsDir -Force | Out-Null
  try {
    $rel = Invoke-RestMethod 'https://api.github.com/repos/win-acme/win-acme/releases/latest' -Headers @{ 'User-Agent' = 'pwsh' } -UseBasicParsing -TimeoutSec 30
  } catch { Fail "无法访问 GitHub API: $($_.Exception.Message)" }
  $asset = $rel.assets | Where-Object { $_.name -match 'pluggable\.x64\.zip$' } | Select-Object -First 1
  if (-not $asset) { Fail '未找到 win-acme pluggable.x64.zip 资产' }
  $zip = Join-Path $env:TEMP $asset.name
  Write-Host "    下载 $($asset.name) ..."
  Invoke-WebRequest $asset.browser_download_url -OutFile $zip -UseBasicParsing
  if (-not (Get-Command Expand-Archive -ErrorAction SilentlyContinue)) {
    # PS 4.0 兼容
    [System.IO.Compression.ZipFile]::ExtractToDirectory($zip, $wacsDir)
  } else {
    Expand-Archive $zip -DestinationPath $wacsDir -Force
  }
  Remove-Item $zip -Force -ErrorAction SilentlyContinue
  if (-not (Test-Path $wacsExe)) { Fail "解压后未找到 $wacsExe" }
  Ok "win-acme 已就绪: $wacsDir"
} else {
  Ok "win-acme 已存在: $wacsDir"
}

# ---------- 2. 准备目录 ----------
foreach ($d in @($sslDir, $acmeRoot, (Split-Path $acmeRoot -Parent))) {
  if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
}
Ok "证书输出目录: $sslDir"
Ok "ACME 验证目录: $acmeRoot（Node.js 已暴露 /.well-known/acme-challenge/）"

# ---------- 3. 调用 wacs 非交互申请 ----------
# HTTP-01 via filesystem（Node.js 服务 .well-known 路径，无需停服务）
$wacsArgs = @(
  '--target', 'manual',
  '--host', $Domain,
  '--validation', 'filesystem',
  '--webroot', (Split-Path $acmeRoot -Parent),  # 指向 .well-known 的父目录
  '--store', 'pemfiles',
  '--pemfilespath', $sslDir,
  '--email', $Email,
  '--accepttos'
)
if ($Renew) { $wacsArgs = @('--renew', '--force') }

Step "运行 wacs.exe（域名: $Domain）"
Write-Host "    > wacs $($wacsArgs -join ' ')" -ForegroundColor Gray
& $wacsExe @wacsArgs
if ($LASTEXITCODE -ne 0) { Fail "wacs.exe 退出码: $LASTEXITCODE" }

# ---------- 4. 找到生成的证书文件 ----------
# wacs pemfiles 输出形如: <domain>-crt.pem / <domain>-key.pem / <domain>-chain.pem
$crt = Get-ChildItem -Path $sslDir -Filter "*-crt.pem" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Desc | Select-Object -First 1
$key = Get-ChildItem -Path $sslDir -Filter "*-key.pem" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Desc | Select-Object -First 1
if (-not $crt -or -not $key) {
  Warn '未找到 PEM 证书文件，请手动检查 ssl 目录'
  Write-Host "    目录内容:"
  Get-ChildItem $sslDir | ForEach-Object { Write-Host "      $($_.Name)" }
  exit 0
}

# 复制为标准名，方便 install.ps1 引用
$stdCrt = Join-Path $sslDir 'server.crt'
$stdKey = Join-Path $sslDir 'server.key'
Copy-Item $crt.FullName $stdCrt -Force
Copy-Item $key.FullName $stdKey -Force
Ok "证书已就绪:"
Write-Host "    CRT:  $stdCrt"
Write-Host "    KEY:  $stdKey"

# ---------- 5. 续期任务已由 wacs 自动注册（计划任务 wacs）----------
Write-Host ''
Write-Host '============================================' -ForegroundColor Yellow
Write-Host '  Let'\''s Encrypt 证书申请完成' -ForegroundColor Yellow
Write-Host "  域名:       $Domain"
Write-Host "  证书:       $stdCrt"
Write-Host "  私钥:       $stdKey"
Write-Host "  续期:       wacs 已注册计划任务自动续期（默认 60 天周期）"
Write-Host '  下一步:'
Write-Host "    .\install.ps1 -SslCert `"$stdCrt`" -SslKey `"$stdKey`" -WxNotifyUrl `"https://$Domain/api/pay/notify`" ..."
Write-Host '============================================' -ForegroundColor Yellow
