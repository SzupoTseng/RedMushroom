@echo off
chcp 65001 > nul
title RedMushroom Dev
cd /d "%~dp0"

echo.
echo  =============================================
echo   RedMushroom Dev - 啟動前後端
echo  =============================================
echo.
echo  目前資料夾：%CD%
echo.

if not exist package.json (
    echo  [錯誤] 找不到 package.json，dev.bat 必須放在專案根目錄。
    echo.
    pause
    exit /b 1
)

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo  [錯誤] 找不到 Node.js，請先安裝：https://nodejs.org/zh-tw
    echo.
    pause
    exit /b 1
)
echo  Node:
node -v
echo.

REM 檢查 concurrently 本身存在（不只是 node_modules 資料夾）
if not exist "node_modules\concurrently\package.json" (
    echo  [提示] 根目錄沒裝 concurrently，幫你自動 npm install...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo  [錯誤] 根目錄 npm install 失敗，請手動執行：npm install
        echo.
        pause
        exit /b 1
    )
    echo.
    if not exist "node_modules\concurrently\package.json" (
        echo  [錯誤] npm install 完成但 concurrently 仍找不到，請手動執行：npm install concurrently
        echo.
        pause
        exit /b 1
    )
)

if not exist backend\node_modules (
    echo  [錯誤] backend\node_modules 不存在，請先雙擊 start.bat 安裝。
    echo.
    pause
    exit /b 1
)
if not exist frontend\node_modules (
    echo  [錯誤] frontend\node_modules 不存在，請先雙擊 start.bat 安裝。
    echo.
    pause
    exit /b 1
)
if not exist database\redmushroom.db (
    echo  [錯誤] database\redmushroom.db 不存在，請先雙擊 start.bat 建立。
    echo.
    pause
    exit /b 1
)

echo  [OK] 環境檢查通過，準備啟動服務...
echo.

REM 8 秒後用預設瀏覽器開網址（背景）
start "open-browser" /MIN cmd /c "timeout /t 8 /nobreak > nul && start """" http://localhost:5173"

echo  後端 http://localhost:3001
echo  前端 http://localhost:5173 （8 秒後自動以預設瀏覽器開啟）
echo.
echo  按 Ctrl+C 兩次可關閉服務。
echo.

call npm start

echo.
echo  服務已關閉。
pause
