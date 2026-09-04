@echo off
cd /d "E:\zytl\server\test-mysql\app"
set PORT=3998
set ADMIN_USER=admin
set ADMIN_PASS=admin123
set MYSQL_HOST=127.0.0.1
set MYSQL_PORT=3306
set MYSQL_USER=root
set MYSQL_PASS=
set MYSQL_DB=ruanquan_e2e
"E:\zytl\server\test-mysql\runtime\node.exe" "E:\zytl\server\test-mysql\app\index.js" >> "E:\zytl\server\test-mysql\logs\app.log" 2>&1
