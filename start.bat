@echo off
chcp 65001 > nul
title RedMushroom（紅蘑菇）啟動程式
cd /d "%~dp0"
setlocal enabledelayedexpansion

echo.
echo  =============================================
echo   🍄 RedMushroom（紅蘑菇）中文學習系統
echo  =============================================
echo.

:: Check Node.js installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo  ❌ 找不到 Node.js！
    echo.
    echo  請先安裝 Node.js LTS：
    echo  https://nodejs.org/zh-tw
    echo.
    echo  安裝完畢後，請再次雙擊此檔案。
    echo.
    pause
    start https://nodejs.org/zh-tw
    exit /b 1
)

:: ─────────────────────────────────────────────────────────────
:: better-sqlite3 11.x only ships prebuilds for Node 18 / 20 / 22.
:: If the system Node is too new (24+), set up portable Node 22 LTS
:: into .\.tools\node22\ and prepend it to PATH so npm/tsx/node all
:: see Node 22 for the install + runtime. Fully transparent to user.
:: ─────────────────────────────────────────────────────────────
for /f %%v in ('node -e "process.stdout.write(process.versions.node.split(^'.^')[0])"') do set NODE_MAJOR=%%v

if !NODE_MAJOR! GTR 22 (
    if not exist ".tools\node22\node.exe" (
        echo  ⚠  目前的 Node !NODE_MAJOR! 太新，正在自動下載並安裝可攜版 Node 22 LTS...
        echo     （一次性 ~30MB，存放在 .\.tools\node22\）
        if not exist ".tools" mkdir ".tools"
        powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -UseBasicParsing -Uri 'https://nodejs.org/dist/v22.13.1/node-v22.13.1-win-x64.zip' -OutFile '.tools\node22.zip'"
        if errorlevel 1 goto :node22_fail
        powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; Expand-Archive -Force '.tools\node22.zip' '.tools\'"
        if errorlevel 1 goto :node22_fail
        for /d %%d in (".tools\node-v22*-win-x64") do move "%%d" ".tools\node22" >nul
        del ".tools\node22.zip" >nul 2>nul
    )
    if exist ".tools\node22\node.exe" (
        set "PATH=%CD%\.tools\node22;!PATH!"
        echo  ✅ 使用可攜版 Node:
        node --version
        echo.
    )
)

echo  ✅ Node.js 已安裝
echo.

echo  正在安裝並啟動 RedMushroom...
echo  （首次執行可能需要 2-5 分鐘，請耐心等候）
echo.

call node scripts/setup.mjs
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  ⚠  安裝過程出問題，自動執行 reinstall.bat 清乾淨後重試一次...
    echo.
    call reinstall.bat
    if errorlevel 1 (
        echo.
        echo  ❌ 自動修復仍然失敗。請截圖上方訊息回報。
        echo     提示：常見原因是網路無法連到 nodejs.org / npm registry。
        pause
        exit /b 1
    )
    echo.
    echo  → 重試 setup ...
    call node scripts/setup.mjs
    if errorlevel 1 (
        echo.
        echo  ❌ 重試後仍然失敗。請截圖上方訊息回報。
        pause
        exit /b 1
    )
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
exit /b 0

:node22_fail
echo.
echo  ❌ 無法自動下載 Node 22。可能是網路不通或防火牆擋住。
echo     退路方案：請手動到 https://nodejs.org/zh-tw 下載 LTS 版本安裝，
echo     再雙擊本檔案即可。
echo.
pause
start https://nodejs.org/zh-tw
exit /b 1
