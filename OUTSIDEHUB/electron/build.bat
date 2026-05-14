@echo off
title OutsideHub - Criar Instalador
color 0A
echo.
echo  ==========================================
echo   OutsideHub - A criar instalador .exe
echo  ==========================================
echo.

cd /d "%~dp0.."

echo  [1/3] A fazer build (frontend + servidor CJS)...
call pnpm run build:electron
if %errorlevel% neq 0 (
    echo  [x] Erro no build!
    pause & exit /b 1
)
echo  [v] Build concluido!
echo.

cd electron

echo  [2/3] A instalar dependencias do Electron...
call npm install
if %errorlevel% neq 0 (
    echo  [x] Erro ao instalar dependencias!
    pause & exit /b 1
)
echo  [v] Dependencias instaladas!
echo.

echo  [3/3] A empacotar instalador Windows...
call npm run build:win
if %errorlevel% neq 0 (
    echo  [x] Erro ao criar instalador!
    pause & exit /b 1
)

echo.
echo  ==========================================
echo   [v] Instalador criado em: release\
echo  ==========================================
echo.
pause
