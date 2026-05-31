@echo off
chcp 65001 > nul
title RedMushroom
cd /d "%~dp0"

echo.
echo  =============================================
echo   RedMushroom (Hong Mo Gu) - Chinese Learning
echo  =============================================
echo.

REM ---- Check Node installed ----
where node >nul 2>nul
if errorlevel 1 (
    echo  [X] Node.js is NOT installed.
    echo      Please install Node.js LTS from https://nodejs.org/zh-tw
    echo      Then double-click this file again.
    pause
    start https://nodejs.org/zh-tw
    exit /b 1
)

REM ---- Get Node major version into NODE_MAJOR ----
for /f %%v in ('node -e "process.stdout.write(process.versions.node.split('.')[0])"') do set NODE_MAJOR=%%v
echo  [i] Detected system Node major version: %NODE_MAJOR%

REM ---- If Node is too new for better-sqlite3 prebuilds, use portable Node 22 ----
if %NODE_MAJOR% GTR 22 call :setup_portable_node22
if errorlevel 1 (
    echo.
    echo  [X] Could not set up portable Node 22.
    echo      Fallback: install Node 22 LTS manually from https://nodejs.org/zh-tw
    pause
    start https://nodejs.org/zh-tw
    exit /b 1
)

echo  [OK] Node.js OK
echo.
echo  Installing and starting RedMushroom...
echo  (First run may take 2-5 minutes.)
echo.

call node scripts/setup.mjs
if errorlevel 1 (
    echo.
    echo  [!] setup.mjs failed. Auto-running reinstall.bat to recover...
    echo.
    call reinstall.bat
    if errorlevel 1 (
        echo.
        echo  [X] reinstall failed too. Please screenshot the messages above.
        pause
        exit /b 1
    )
    echo.
    echo  Retrying setup...
    call node scripts/setup.mjs
    if errorlevel 1 (
        echo.
        echo  [X] Setup still failed after reinstall. Please screenshot.
        pause
        exit /b 1
    )
)

echo.
echo  Starting service...
start /B npm start

REM Wait for backend to come up
timeout /t 5 /nobreak > nul

REM Open browser
start http://localhost:5173

echo.
echo  RedMushroom is running.
echo  Use it in the browser. Closing this window stops the service.
echo.
pause
exit /b 0


REM =====================================================================
REM Subroutine: set up portable Node 22 LTS in .\.tools\node22\
REM Called when system Node is too new for better-sqlite3 prebuilds.
REM Returns 0 on success (PATH updated), 1 on failure.
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
