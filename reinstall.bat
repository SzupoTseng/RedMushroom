@echo off
title RedMushroom reinstall (Windows native shims)
cd /d "%~dp0"

echo.
echo  =============================================
echo   Reinstall node_modules (Windows native)
echo  =============================================
echo.
echo  If node_modules were installed from WSL/Linux,
echo  the .bin directory contains symlinks, not .cmd
echo  shims. Windows CMD cannot find concurrently etc.
echo.
echo  This script will:
echo    1. delete root / backend / frontend node_modules
echo    2. run npm install in each layer (Windows side)
echo.
echo  Press any key to continue, or close window to abort.
pause > nul

echo.
echo  [1/6] removing root node_modules...
if exist node_modules rmdir /S /Q node_modules

echo  [2/6] removing backend\node_modules...
if exist backend\node_modules rmdir /S /Q backend\node_modules

echo  [3/6] removing frontend\node_modules...
if exist frontend\node_modules rmdir /S /Q frontend\node_modules

echo.
echo  [4/6] npm install (root)...
call npm install
if errorlevel 1 goto :fail

echo.
echo  [5/6] npm install (backend)...
call npm install --prefix backend
if errorlevel 1 goto :fail

echo.
echo  [6/6] npm install (frontend)...
call npm install --prefix frontend
if errorlevel 1 goto :fail

echo.
echo  =============================================
echo   Done. You can now double-click dev.bat
echo  =============================================
echo.
pause
exit /b 0

:fail
echo.
echo  npm install failed. See the messages above.
echo.
pause
exit /b 1
