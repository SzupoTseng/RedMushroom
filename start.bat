@echo off
chcp 65001 > nul
title RedMushroom（紅蘑菇）啟動程式

echo.
echo  =============================================
echo   🍄 RedMushroom（紅蘑菇）中文學習系統
echo  =============================================
echo.

:: 檢查 Node.js 是否安裝
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo  ❌ 找不到 Node.js！
    echo.
    echo  請先安裝 Node.js：
    echo  https://nodejs.org/zh-tw
    echo.
    echo  安裝完畢後，請再次雙擊此檔案。
    echo.
    pause
    start https://nodejs.org/zh-tw
    exit /b 1
)

echo  ✅ Node.js 已安裝
echo.

:: 執行安裝腳本
echo  正在安裝並啟動 RedMushroom...
echo  （首次執行可能需要 2-5 分鐘，請耐心等候）
echo.

node scripts/setup.mjs
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  ❌ 安裝過程發生錯誤，請截圖以上訊息並回報。
    pause
    exit /b 1
)

echo.
echo  正在啟動服務...
start /B npm start

:: 等待後端啟動
timeout /t 5 /nobreak > nul

:: 開啟瀏覽器
start http://localhost:5173

echo.
echo  🍄 RedMushroom 已啟動！
echo  請在瀏覽器中使用，關閉此視窗會停止服務。
echo.
pause
