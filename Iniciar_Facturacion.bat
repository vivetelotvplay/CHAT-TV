@echo off
title red social de oficios 
echo ========================================
echo    RED SOCIAL DE OFICIOS
echo ========================================
echo.
echo Iniciando servidor...
echo.

cd /d "%~dp0"

start http://localhost:3000/index.html
start http://localhost:3000/login.html
start http://localhost:3000/profile.html
start http://localhost:3000/feed.html

deno run --allow-net --allow-read --allow-write server.ts

pause
