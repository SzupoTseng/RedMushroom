@echo off
title RedMushroom reinstall (Windows native shims)
cd /d "%~dp0"

echo.
echo  =============================================
echo   Reinstall node_modules (Windows native)
echo  =============================================
echo.
echo  Clears and reinstalls all four node_modules layers:
echo    root / backend / frontend / scripts
echo.
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
echo   Done. You can now double-click Run.bat
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
