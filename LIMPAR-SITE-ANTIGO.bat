@echo off
title LIMPANDO SITE ANTIGO (ROXO)
color 0C

echo ==========================================
echo    REMOVENDO SITE ANTIGO (ROXO)
echo ==========================================
echo.
echo Deletando arquivos antigos da raiz...
echo.

REM Deletar arquivos de configuração antigos
del /Q vite.config.ts 2>nul
echo ✅ vite.config.ts removido

del /Q tsconfig.json 2>nul
echo ✅ tsconfig.json removido

del /Q tailwind.config.ts 2>nul
echo ✅ tailwind.config.ts removido

del /Q postcss.config.mjs 2>nul
echo ✅ postcss.config.mjs removido

del /Q .gitignore 2>nul
echo ✅ .gitignore removido

REM Deletar pasta client antigo
rmdir /s /q client 2>nul
echo ✅ Pasta client/ removida

REM Deletar pasta server antigo
rmdir /s /q server 2>nul
echo ✅ Pasta server/ removida

REM Deletar pasta shared antigo
rmdir /s /q shared 2>nul
echo ✅ Pasta shared/ removida

REM Deletar node_modules antigo
rmdir /s /q node_modules 2>nul
echo ✅ Pasta node_modules/ removida

REM Deletar pasta dist antigo
rmdir /s /q dist 2>nul
echo ✅ Pasta dist/ removida

REM Deletar package.json antigo (CUIDADO!)
REM Mantém package.json para referência, mas comentado
echo.
echo ==========================================
echo ✅ LIMPEZA CONCLUÍDA!
echo.
echo Arquivos mantidos:
echo   ✓ start.bat (modificado)
echo   ✓ outsidehub-platform-webdev/ (novo sistema vermelho)
echo   ✓ package.json (como referência apenas)
echo.
echo Próximo passo: Execute start.bat
echo ==========================================
echo.

pause
