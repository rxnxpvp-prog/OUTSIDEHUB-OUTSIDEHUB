@echo off
title OUTSIDEHUB AUTO INSTALL + RUN
color 0D

echo ==========================================
echo        OUTSIDEHUB AUTO START
echo ==========================================
echo.

cd /d "%~dp0"

echo [1/6] Limpando instalacao antiga...
rmdir /s /q node_modules 2>nul
del pnpm-lock.yaml 2>nul

echo.
echo [2/6] Instalando dependencias...
call pnpm install

echo.
echo [3/6] Instalando dependencias extras...
call pnpm add -D concurrently tsx

echo.
echo [4/6] Liberando builds...
call pnpm approve-builds

echo.
echo [5/6] Iniciando BACKEND...
start cmd /k "cd /d %~dp0 && pnpm run server"

timeout /t 5 >nul

echo.
echo [6/6] Iniciando FRONTEND...
start cmd /k "cd /d %~dp0 && pnpm run dev"

echo.
echo ==========================================
echo SITE: http://localhost:5173
echo API : http://localhost:3333
echo LOGIN: crema
echo SENHA: crema
echo ==========================================

pause
