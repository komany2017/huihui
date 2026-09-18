# ============================================
# 润泉养元 · Nginx HTTPS 配置生成与安装脚本
# 在服务器上运行：powershell -ExecutionPolicy Bypass -File setup-nginx.ps1
# 需要管理员权限
# ============================================
param(
  [string]$Domain = '',
  [int]$AppPort = 3000,
  [int]$HttpsPort = 443,
  [switch]$SelfSigned
)
$ErrorActionPreference = 'Stop'
function Step($m) { Write-Host "`n==> $m" -ForegroundColor Cyan }
function Ok($m) { Write-Host "    [OK] $m" -ForegroundColor Green }
function Warn($m) { Write-Host "    [!] $m" -ForegroundColor Yellow }
function Fail($m) { Write-Host "    [X] $m" -ForegroundColor Red; exit 1 }

$root = $PSScriptRoot
$certDir = Join-Path $root 'ssl'
$nginxConf = Join-Path $root 'nginx.conf'

# ---------- 1. 生成 SSL 证书 ----------
Step 'SSL 证书'
if (-not (Test-Path $certDir)) { New-Item -ItemType Directory -Path $certDir -Force | Out-Null }

$certFile = Join-Path $certDir 'server.crt'
$keyFile = Join-Path $certDir 'server.key'

if ($Domain -or -not $SelfSigned) {
  # 有域名：提示用户放置正式证书
  if ((Test-Path $certFile) -and (Test-Path $keyFile)) {
    Ok "已有证书: $certFile"
  } else {
    Warn "请将 SSL 证书文件放到:"
    Warn "  证书: $certFile"
    Warn "  私钥: $keyFile"
    Warn "（从云服务商下载免费 DV 证书，通常为 .crt/.pem 和 .key 格式）"
    if (-not $SelfSigned) {
      $a = Read-Host "  暂无正式证书，先生成自签名证书用于测试？(Y/n)"
      if ($a -ne 'n') { $SelfSigned = $true } else { Fail '请放置证书后重新运行' }
    }
  }
}

if ($SelfSigned -and -not ((Test-Path $certFile) -and (Test-Path $keyFile))) {
  $cn = if ($Domain) { $Domain } else { 'localhost' }
  $subj = "/CN=$cn"
  $altNames = "subjectAltName=DNS:$cn"
  if (-not $Domain) { $altNames = "subjectAltName=DNS:localhost,IP:127.0.0.1" }
  $openssl = 'openssl'
  $osExe = Get-Command openssl.exe -ErrorAction SilentlyContinue
  if (-not $osExe) {
    $gitOpenssl = Get-ChildItem 'C:\Program Files\Git\usr\bin\openssl.exe','C:\Program Files\Git\mingw64\bin\openssl.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($gitOpensl) { $openssl = $gitOpenssl.FullName }
  }
  $tmpConf = Join-Path $certDir 'openssl.cnf'
  @"
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no
[req_distinguished_name]
CN = $cn
[v3_req]
$altNames
"@ | Set-Content $tmpConf -Encoding ASCII
  & $openssl req -x509 -newkey rsa:2048 -keyout $keyFile -out $certFile -days 365 -nodes -config $tmpConf -extensions v3_req 2>&1 | Out-Null
  Remove-Item $tmpConf -Force -ErrorAction SilentlyContinue
  Ok "自签名证书已生成（CN=$cn, 365天）"
  if (-not $Domain) { Warn "自签名证书仅用于测试，微信正式版需要 CA 签发的证书 + 备案域名" }
}

# ---------- 2. 生成 Nginx 配置 ----------
Step 'Nginx 配置'
$serverName = if ($Domain) { $Domain } else { '_' }
$httpRedirect = if ($HttpsPort -eq 443) { "
server {
    listen 80;
    server_name $serverName;
    # HTTP -> HTTPS 跳转
    return 301 https://`$server_name`$request_uri;
}
" } else { "
server {
    listen 80;
    server_name $serverName;
    # 如不跳转，直接代理
    location / {
        proxy_pass http://127.0.0.1:$AppPort;
        proxy_http_version 1.1;
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;
    }
}
" }

$nginxConfContent = @"
# ============================================
# 润泉养元 Nginx 反向代理配置
# 生成时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
# 域名: $serverName
# 后端: 127.0.0.1:$AppPort
# SSL端口: $HttpsPort
# 部署方式: nginx -c "$nginxConf"  或复制到 nginx/conf/
# ============================================

worker_processes auto;

events {
    worker_connections 1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;
    sendfile     on;
    keepalive_timeout 65;
    client_max_body_size 50m;

    # gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1024;

    # WebSocket + HTTP 代理
    map `$http_upgrade `$connection_upgrade {
        default upgrade;
        '' close;
    }

$httpRedirect

server {
    listen $HttpsPort ssl;
    server_name $serverName;

    ssl_certificate     "$certFile";
    ssl_certificate_key "$keyFile";
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;

    # 主应用代理
    location / {
        proxy_pass http://127.0.0.1:$AppPort;
        proxy_http_version 1.1;
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection `$connection_upgrade;
        proxy_read_timeout 300s;
    }

    # 图片缓存（静态文件直出）
    location /api/media/ {
        proxy_pass http://127.0.0.1:$AppPort;
        proxy_http_version 1.1;
        proxy_set_header Host `$host;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 图片代理缓存
    location /api/image-proxy {
        proxy_pass http://127.0.0.1:$AppPort;
        proxy_http_version 1.1;
        proxy_set_header Host `$host;
        expires 7d;
        add_header Cache-Control "public";
    }

    # 管理后台静态资源缓存
    location ~* \.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?)$ {
        proxy_pass http://127.0.0.1:$AppPort;
        proxy_http_version 1.1;
        proxy_set_header Host `$host;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 健康检查不缓存
    location = /api/health {
        proxy_pass http://127.0.0.1:$AppPort;
        proxy_http_version 1.1;
        proxy_set_header Host `$host;
        add_header Cache-Control "no-cache";
    }
}
"@
[System.IO.File]::WriteAllText($nginxConf, $nginxConfContent, [System.Text.Encoding]::UTF8)
Ok "Nginx 配置: $nginxConf"

# ---------- 3. 安装 Nginx（如未安装）----------
Step 'Nginx 安装检查'
$nginxExe = Get-Command nginx -ErrorAction SilentlyContinue
if ($nginxExe) {
  Ok "Nginx 已安装: $($nginxExe.Source)"
  & nginx -v 2>&1 | ForEach-Object { Ok "版本: $_" }
} else {
  $winget = Get-Command winget -ErrorAction SilentlyContinue
  $choco = Get-Command choco -ErrorAction SilentlyContinue
  if ($winget) {
    Warn "Nginx 未安装，尝试 winget 安装..."
    winget install nginx.nginx --accept-package-agreements --accept-source-agreements
  } elseif ($choco) {
    Warn "Nginx 未安装，尝试 chocolatey 安装..."
    choco install nginx -y
  } else {
    Warn "Nginx 未安装，无 winget/choco"
    Warn "请手动安装："
    Warn "  1. 下载 http://nginx.org/download/nginx-1.25.3.zip"
    Warn "  2. 解压到 C:\nginx"
    Warn "  3. 复制本目录的 nginx.conf 到 C:\nginx\conf\nginx.conf"
    Warn "  4. 复本目录的 ssl\ 到 C:\nginx\conf\ssl\"
    Warn "  5. 运行: C:\nginx\nginx.exe -c C:\nginx\conf\nginx.conf"
  }
}

# ---------- 4. 启动/重载 ----------
Step 'Nginx 启动'
if ($nginxExe -or (Get-Command nginx -ErrorAction SilentlyContinue)) {
  # 测试配置
  $testResult = & nginx -t -c $nginxConf 2>&1
  if ($LASTEXITCODE -eq 0) {
    Ok "配置语法检查通过"
    # 尝试重载或启动
    $existing = Get-Process nginx -ErrorAction SilentlyContinue
    if ($existing) {
      & nginx -s reload -c $nginxConf 2>&1
      Ok "Nginx 已重载"
    } else {
      Start-Process -FilePath 'nginx' -ArgumentList '-c', $nginxConf -WindowStyle Hidden
      Ok "Nginx 已启动"
    }
  } else {
    Warn "配置检查失败: $testResult"
  }
}

# ---------- 5. 防火墙 ----------
Step '防火墙'
if (Test-IsAdmin) {
  Run-Quiet { netsh advfirewall firewall delete rule name="Ruanquan HTTPS" 2>$null | Out-Null }
  netsh advfirewall firewall add rule name="Ruanquan HTTPS" dir=in action=allow protocol=TCP localport=$HttpsPort profile=any 2>&1 | Out-Null
  Ok "防火墙已放行 TCP $HttpsPort (HTTPS)"
} else {
  Warn '非管理员，请手动放行 TCP 443'
}

# ---------- 完成 ----------
$scheme = 'https'
$portSuffix = if ($HttpsPort -eq 443) { '' } else { ":$HttpsPort" }
$hostName = if ($Domain) { $Domain } else { 'localhost' }
Write-Host ''
Write-Host '============================================' -ForegroundColor Yellow
Write-Host '  HTTPS 配置完成' -ForegroundColor Yellow
Write-Host "  HTTPS 地址: ${scheme}://${hostName}${portSuffix}/"
Write-Host "  证书文件:   $certFile"
Write-Host "  Nginx配置:  $nginxConf"
Write-Host "  小程序API:  改 src/config/api.ts 为 ${scheme}://${hostName}${portSuffix}"
if (-not $Domain) {
  Write-Host ''
  Write-Host '  [!] 当前为自签名证书，仅限测试/体验版' -ForegroundColor Red
  Write-Host '  [!] 正式发布需: 备案域名 + CA 签发证书' -ForegroundColor Red
}
Write-Host '============================================' -ForegroundColor Yellow
