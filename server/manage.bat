@echo off
rem Ruanquan backend manager. Usage: manage.bat start^|stop^|restart^|status^|logs^|uninstall
setlocal
rem self-heal: strip stacked UTF-8 BOMs from ps1 scripts before running them
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0fixbom.ps1" "%~dp0install.ps1" "%~dp0manage.ps1"
set "ACTION=%~1"
if "%ACTION%"=="" set ACTION=status
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0manage.ps1" -Action %ACTION%
if "%~1"=="" (
  echo.
  pause
)
