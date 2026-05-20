@echo off

set ANTHROPIC_API_KEY=sk-JLuTV1jsiHFAgqCalGoGeVOzVjXvv2x7V9G_fnc8auzKnRsC
set ANTHROPIC_BASE_URL=https://tc-paperhub.diezhi.net/anthropic
set CLAUDE_LANG=zh

set "WORK_DIR=%~dp0"
set "WORK_DIR=%WORK_DIR:~0,-1%"
cd /d "%WORK_DIR%"

where wt >nul 2>&1
if %errorlevel% equ 0 (
    wt --title "Claude Code" --startingDirectory "%WORK_DIR%" cmd /k "chcp 65001 >nul && set ANTHROPIC_API_KEY=%ANTHROPIC_API_KEY% && set ANTHROPIC_BASE_URL=%ANTHROPIC_BASE_URL% && set CLAUDE_LANG=%CLAUDE_LANG% && claude --model deepseek-v4-pro
"
) else (
    cmd /k "chcp 65001 >nul && claude --model deepseek-v4-pro"
)