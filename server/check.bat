@echo off
rem Ruanquan environment checker (no admin required). ASCII only.
setlocal
rem self-heal: strip stacked UTF-8 BOMs from ps1 scripts before running them
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0fixbom.ps1" "%~dp0check-env.ps1"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0check-env.ps1"
echo.
pause
