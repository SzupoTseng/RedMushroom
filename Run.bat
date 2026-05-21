@echo off
title RedMushroom Dev
cd /d "%~dp0"

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

REM ── create DB if missing ─────────────────────────────────────────────
if not exist database\redmushroom.db (
    echo  [INFO] Database not found. Running full setup...
    call npm run setup
    if %ERRORLEVEL% NEQ 0 ( echo  [ERROR] Setup failed. & pause & exit /b 1 )
    echo.
    goto :launch
)

REM ── detect stale DB: correct answer always slot 1 = pre-shuffle seed ──
node scripts\check-db-fresh.js 2>nul
if %ERRORLEVEL% EQU 2 (
    echo  [INFO] Database has old answer layout. Regenerating question bank...
    del database\redmushroom.db
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
