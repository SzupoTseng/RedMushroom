@echo off
title RedMushroom Dev
cd /d "%~dp0"

REM Use portable Node 22 LTS if present (set up by start.bat / reinstall.bat).
REM Without this, system Node 24+ would hit better-sqlite3 ABI mismatch.
if exist ".tools\node22\node.exe" set "PATH=%CD%\.tools\node22;%PATH%"

echo.
echo  =============================================
echo   RedMushroom Dev
echo  =============================================
echo.
echo  Folder: %CD%
echo.

if not exist package.json (
    echo  [ERROR] package.json not found. Put Run.bat in the project root.
    pause & exit /b 1
)

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] Node.js not found. Install from https://nodejs.org
    pause & exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do echo  Node %%v
echo.

REM ── auto-install root deps if missing ────────────────────────────────
if not exist "node_modules\concurrently\package.json" (
    echo  [INFO] Installing root dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 ( echo  [ERROR] npm install failed. & pause & exit /b 1 )
    echo.
)

if not exist backend\node_modules (
    echo  [ERROR] backend\node_modules missing. Run start.bat first.
    pause & exit /b 1
)
if not exist frontend\node_modules (
    echo  [ERROR] frontend\node_modules missing. Run start.bat first.
    pause & exit /b 1
)

REM ── check DB version marker ───────────────────────────────────────────
REM   setup.mjs writes  database\.db-version  after seeding.
REM   If the file is absent the DB is missing or was seeded with an old
REM   version (e.g. before the answer-shuffle fix) and must be regenerated.
if not exist "database\.db-version" (
    echo  [INFO] DB version marker missing. Running full setup...
    if exist database\redmushroom.db del /f database\redmushroom.db 2>nul
    call npm run setup
    if %ERRORLEVEL% NEQ 0 ( echo  [ERROR] Setup failed. & pause & exit /b 1 )
    echo.
)

:launch
echo  [OK] Environment ready.
echo.
echo  Backend  http://localhost:3001
echo  Frontend http://localhost:5173
echo  Browser opens automatically in 8 seconds.
echo.
echo  Press Ctrl+C twice to stop all services.
echo.

start "open-browser" /MIN cmd /c "timeout /t 8 /nobreak > nul && start """" http://localhost:5173"

call npm start

echo.
echo  Services stopped.
pause
