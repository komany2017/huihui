@echo off
rem Ruanquan backend installer (double-click entry). ASCII only on purpose.
setlocal
rem self-heal: strip stacked UTF-8 BOMs from ps1 scripts before running them
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0fixbom.ps1" "%~dp0install.ps1" "%~dp0manage.ps1"
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Requesting administrator privileges...
  powershell -NoProfile -Command "Start-Process -FilePath \"%~f0\" -Verb RunAs"
  exit /b
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1" -Action install %*
echo.
pause
