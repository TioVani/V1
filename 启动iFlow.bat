@echo off
chcp 65001 >nul
title Start iFlow CLI

echo ========================================
echo           Start iFlow CLI
echo ========================================
echo.

cd /d "%~dp0"

set IFLOW_CMD=C:\Users\Administrator\AppData\Roaming\npm\iflow.cmd

if not exist "%IFLOW_CMD%" (
    echo [Error] iFlow not found
    echo Path: %IFLOW_CMD%
    echo.
    pause
    exit /b 1
)

echo Starting iFlow CLI with glm-5...
echo.

call "%IFLOW_CMD%" -m glm-5

pause