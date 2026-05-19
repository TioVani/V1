@echo off
chcp 65001 >nul
title Start CodeBuddy Code CLI

echo ========================================
echo       Start CodeBuddy Code CLI
echo ========================================
echo.

cd /d "%~dp0"

set CB_CMD=C:\Users\Administrator\AppData\Roaming\npm\codebuddy.cmd

if not exist "%CB_CMD%" (
    echo [Error] CodeBuddy Code not found
    echo Path: %CB_CMD%
    echo.
    pause
    exit /b 1
)

echo Starting CodeBuddy Code CLI with glm-5.1...
echo.

call "%CB_CMD%" --model glm-5.1

pause
