@echo off
title OutsideHub RPC Companion
echo Verificando dependencias do Node.js...
if not exist node_modules (
  echo Instalando dependencias (discord-rpc e axios)...
  call npm install discord-rpc axios
)
echo Iniciando Discord RPC do OutsideHub...
node outsidehub-rpc.js
pause
