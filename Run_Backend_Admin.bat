@echo off
:: Request Administrator Privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Administrator privileges confirmed.
    cd /d "%~dp0\server"
    echo Starting DPI Dashboard Server...
    npm run dev
    pause
) else (
    echo Requesting administrative privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
)
