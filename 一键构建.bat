@echo off
chcp 65001 >nul
title Build Game (Excel - JS - Bundle)

echo ========================================
echo     器落山河 - Build
echo     Excel - JS - game-modules.js
echo ========================================
echo.

cd /d "%~dp0"

echo [1/2] Converting Excel data...
call npm run convert
if errorlevel 1 (
    echo.
    echo [ERROR] Excel convert failed!
    pause
    exit /b 1
)
echo.

echo [2/2] Rollup bundling...
call npm run build:only
if errorlevel 1 (
    echo.
    echo [ERROR] Bundle failed!
    pause
    exit /b 1
)
echo.

echo ========================================
echo     Build complete!
echo ========================================
pause
