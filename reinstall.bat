@echo off
chcp 65001 > nul
title RedMushroom reinstall (Windows native shims)
cd /d "%~dp0"
setlocal enabledelayedexpansion

echo.
echo  =============================================
echo   Reinstall node_modules (Windows native)
echo  =============================================
echo.
echo  Clears and reinstalls all four node_modules layers:
echo    root / backend / frontend / scripts
echo.

:: ─────────────────────────────────────────────────────────────
:: Pre-flight: ensure we have a Node version that better-sqlite3
:: 11.x has prebuilds for (Node 18 / 20 / 22). Node 24+ has no
:: prebuild, falls back to source compile, which needs Python +
:: VS Build Tools — not realistic for end users. If the system
:: Node is too new, transparently set up portable Node 22 LTS in
:: .\.tools\node22\ and use it for this install (and for start.bat
:: thereafter — start.bat also prepends .tools\node22 to PATH if
:: it exists).
:: ─────────────────────────────────────────────────────────────
where node >nul 2>nul
if errorlevel 1 (
    echo  Node.js is not installed. Get the LTS from https://nodejs.org/zh-tw
    pause & exit /b 1
)

for /f %%v in ('node -e "process.stdout.write(process.versions.node.split(^'.^')[0])"') do set NODE_MAJOR=%%v
echo  Detected system Node major version: !NODE_MAJOR!

if !NODE_MAJOR! GTR 22 (
    echo.
    echo  ⚠  Node !NODE_MAJOR! is too new for better-sqlite3 prebuilds.
    echo     Setting up portable Node 22 LTS in .\.tools\node22\ ^(one-time, ~30MB^)...

    if not exist ".tools" mkdir ".tools"
    if not exist ".tools\node22\node.exe" (
        echo  → downloading Node 22 LTS from nodejs.org ...
        powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -UseBasicParsing -Uri 'https://nodejs.org/dist/v22.13.1/node-v22.13.1-win-x64.zip' -OutFile '.tools\node22.zip'"
        if errorlevel 1 goto :node22_fail

        echo  → extracting ...
        powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; Expand-Archive -Force '.tools\node22.zip' '.tools\'"
        if errorlevel 1 goto :node22_fail

        for /d %%d in (".tools\node-v22*-win-x64") do (
            move "%%d" ".tools\node22" >nul
        )
        del ".tools\node22.zip" >nul 2>nul
    )

    if not exist ".tools\node22\node.exe" goto :node22_fail

    set "PATH=%CD%\.tools\node22;!PATH!"
    echo  → now using portable Node:
    node --version
    echo.
)

echo  Press any key to continue, or close window to abort.
pause > nul

echo.
echo  [1/8] removing root node_modules...
if exist node_modules rmdir /S /Q node_modules

echo  [2/8] removing backend\node_modules...
if exist backend\node_modules rmdir /S /Q backend\node_modules

echo  [3/8] removing frontend\node_modules...
if exist frontend\node_modules rmdir /S /Q frontend\node_modules

echo  [4/8] removing scripts\node_modules...
if exist scripts\node_modules rmdir /S /Q scripts\node_modules

echo.
echo  [5/8] npm install (root)...
call npm install
if errorlevel 1 goto :fail

echo.
echo  [6/8] npm install (backend)...
call npm install --prefix backend
if errorlevel 1 goto :fail

echo.
echo  [7/8] npm install (frontend)...
call npm install --prefix frontend
if errorlevel 1 goto :fail

echo.
echo  [8/8] npm install (scripts)...
call npm install --prefix scripts
if errorlevel 1 goto :fail

echo.
echo  =============================================
echo   Done. You can now double-click start.bat
echo  =============================================
echo.
pause
exit /b 0

:node22_fail
echo.
echo  ❌ Failed to set up portable Node 22.
echo     Manual fix: install Node 22 LTS from https://nodejs.org/zh-tw
echo     ^(green LTS button^), then run this script again.
echo.
pause
exit /b 1

:fail
echo.
echo  ❌ npm install failed. See the messages above.
echo.
pause
exit /b 1
