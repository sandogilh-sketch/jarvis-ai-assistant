@echo off
REM ========================================
REM JARVIS - Abrir en Navegador
REM ========================================

setlocal enabledelayedexpansion
chcp 65001 >nul

echo Abriendo Jarvis en tu navegador...
echo.

REM Esperar a que el servidor esté listo
timeout /t 3 /nobreak

REM Abrir navegador
start http://localhost:3000

echo ✅ Abierto en http://localhost:3000
