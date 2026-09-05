﻿# ============================================
# 本地开发一键启动：MySQL（如未运行）+ 后台服务（MySQL 存储）
# 用法：npm run dev:mysql
# ============================================
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent

function Test-Port3306 {
  $c = New-Object Net.Sockets.TcpClient
  $ok = $c.ConnectAsync('127.0.0.1', 3306).Wait(800)
  $c.Close()
  return $ok
}

# 1) MySQL
if (Test-Port3306) {
  Write-Host '[mysql] 已有 MySQL 实例运行在 127.0.0.1:3306' -ForegroundColor Green
} else {
  Write-Host '[mysql] 启动本地 MySQL（首次运行会自动下载官方二进制，请耐心等待）...' -ForegroundColor Cyan
  Start-Process -FilePath 'node' -ArgumentList 'run-mysql.mjs' -WorkingDirectory 'e:\mysql8\runner' -WindowStyle Hidden
  $deadline = (Get-Date).AddSeconds(300)
  do {
    Start-Sleep -Seconds 3
    $ok = Test-Port3306
  } while (-not $ok -and (Get-Date) -lt $deadline)
  if ($ok) { Write-Host '[mysql] MySQL 已就绪' -ForegroundColor Green }
  else { Write-Host '[mysql] 启动超时（可手动运行: node e:\mysql8\runner\run-mysql.mjs 查看日志）' -ForegroundColor Red; exit 1 }
}

# 2) 后台服务（MySQL 存储）
$env:MYSQL_HOST = '127.0.0.1'
$env:MYSQL_PORT = '3306'
$env:MYSQL_USER = 'root'
$env:MYSQL_PASS = ''
$env:MYSQL_DB = 'ruanquan'
Set-Location $root
node server/index.js
