@echo off
chcp 65001 >nul
title OpenCode Admin
cd /d "%~dp0"
start "" http://127.0.0.1:8787
netstat -ano | findstr ":8787" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 exit /b
node server.js
pause
