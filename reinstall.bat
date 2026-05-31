@echo off
chcp 65001 > nul
title RedMushroom reinstall
cd /d "%~dp0"

echo.
echo  =============================================
echo   Reinstall node_modules (Windows native)
echo  =============================================
echo.
echo  This will:
echo    1. Optionally download portable Node 22 LTS if your Node is too new
echo    2. Delete all 4 node_modules folders (root / backend / frontend / scripts)
echo    3. Run npm install in each
echo.

REM ---- Check Node installed ----
where node >nul 2>nul
if errorlevel 1 (
    echo  [X] Node.js is NOT installed.
    echo      Install Node 22 LTS from https://nodejs.org/zh-tw
    pause
    exit /b 1
)

REM ---- Get Node major version into NODE_MAJOR ----
for /f %%v in ('node -e "process.stdout.write(process.versions.node.split('.')[0])"') do set NODE_MAJOR=%%v
echo  [i] Detected system Node major version: %NODE_MAJOR%

REM ---- Use portable Node 22 if system Node is too new ----
if %NODE_MAJOR% GTR 22 call :setup_portable_node22
if errorlevel 1 (
    echo  [X] Portable Node 22 setup failed.
    pause
    exit /b 1
)

echo.
echo  Press any key to continue, or close window to abort.
pause > nul

echo.
echo  [1/8] removing root node_modules ...
if exist node_modules rmdir /S /Q node_modules

echo  [2/8] removing backend\node_modules ...
if exist backend\node_modules rmdir /S /Q backend\node_modules

echo  [3/8] removing frontend\node_modules ...
if exist frontend\node_modules rmdir /S /Q frontend\node_modules

echo  [4/8] removing scripts\node_modules ...
if exist scripts\node_modules rmdir /S /Q scripts\node_modules

echo.
echo  [5/8] npm install (root) ...
call npm install
if errorlevel 1 goto :npm_fail

echo.
echo  [6/8] npm install (backend) ...
call npm install --prefix backend
if errorlevel 1 goto :npm_fail

echo.
echo  [7/8] npm install (frontend) ...
call npm install --prefix frontend
if errorlevel 1 goto :npm_fail

echo.
echo  [8/8] npm install (scripts) ...
call npm install --prefix scripts
if errorlevel 1 goto :npm_fail

echo.
echo  =============================================
echo   Done. You can now double-click start.bat
echo  =============================================
echo.
pause
exit /b 0


REM =====================================================================
REM Subroutine: set up portable Node 22 LTS in .\.tools\node22\
REM =====================================================================
:setup_portable_node22
echo.
echo  [!] Node %NODE_MAJOR% is too new for better-sqlite3 prebuilds.
echo      Setting up portable Node 22 LTS in .\.tools\node22\
echo      (one-time download, about 30 MB).
echo.

if not exist ".tools" mkdir ".tools"
if not exist ".tools\node22\node.exe" (
    echo  Downloading Node 22 LTS from nodejs.org ...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -UseBasicParsing -Uri 'https://nodejs.org/dist/v22.13.1/node-v22.13.1-win-x64.zip' -OutFile '.tools\node22.zip'"
    if errorlevel 1 exit /b 1

    echo  Extracting...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Force '.tools\node22.zip' '.tools\'"
    if errorlevel 1 exit /b 1

    for /d %%d in (".tools\node-v22*-win-x64") do move "%%d" ".tools\node22" >nul
    del ".tools\node22.zip" >nul 2>nul
)

if not exist ".tools\node22\node.exe" exit /b 1

set "PATH=%CD%\.tools\node22;%PATH%"
echo  [OK] Using portable Node:
node --version
exit /b 0


:npm_fail
echo.
echo  [X] npm install failed. See messages above.
echo.
pause
exit /b 1
