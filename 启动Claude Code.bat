@echo off
chcp 65001 >nul
title Claude Code (GLM)

cd /d "%~dp0"

where claude >nul 2>&1
if %errorlevel% neq 0 (
    echo [Error] Claude Code not found
    echo Please install: npm install -g @anthropic-ai/claude-code
    pause
    exit /b 1
)

wt -d "%~dp0%\" cmd /k chcp 65001 ^>nul ^& claude
