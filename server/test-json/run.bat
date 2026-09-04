@echo off
cd /d "E:\zytl\server\test-json\app"
set PORT=3999
set ADMIN_USER=admin
set ADMIN_PASS=admin123
"E:\zytl\server\test-json\runtime\node.exe" "E:\zytl\server\test-json\app\index.js" >> "E:\zytl\server\test-json\logs\app.log" 2>&1
