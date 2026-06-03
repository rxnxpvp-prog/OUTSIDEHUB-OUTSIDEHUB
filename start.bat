@echo off
setlocal
title OutsideHub - Dev
color 0D

cd /d "%~dp0"

echo ==========================================
echo  OutsideHub - ambiente de desenvolvimento
echo ==========================================
echo.

where pnpm >nul 2>nul
if errorlevel 1 (
  echo [x] pnpm nao encontrado. Instale o pnpm antes de continuar.
  pause
  exit /b 1
)

if not exist node_modules (
  echo [1/2] Instalando dependencias...
  call pnpm install
  if errorlevel 1 (
    echo [x] Falha ao instalar dependencias.
    pause
    exit /b 1
  )
) else (
  echo [1/2] Dependencias ja instaladas.
)

echo [2/2] Iniciando web e API...
echo.
echo Web: http://localhost:5173
echo API: http://localhost:3333/api
echo Login inicial: crema / crema
echo.

call pnpm run dev

endlocal
