@echo off
rem Ruanquan backend manager. Usage: manage.bat start^|stop^|restart^|status^|logs^|uninstall
setlocal
set "ACTION=%~1"
if "%ACTION%"=="" set ACTION=status
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0manage.ps1" -Action %ACTION%
if "%~1"=="" (
  echo.
  pause
)
