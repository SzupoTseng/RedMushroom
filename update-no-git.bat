@echo off
chcp 65001 > nul
title RedMushroom: update (no git needed)
cd /d "%~dp0"

if exist ".tools\node22\node.exe" set "PATH=%CD%\.tools\node22;%PATH%"

set "REPO_URL=https://github.com/SzupoTseng/RedMushroom"
set "BRANCH=main"
set "ZIP_URL=%REPO_URL%/archive/refs/heads/%BRANCH%.zip"
set "TMP_DIR=%TEMP%\rm-update"
set "TMP_ZIP=%TEMP%\rm-update.zip"

echo.
echo  =============================================
echo   RedMushroom Update (no git required)
echo  =============================================
echo.
echo  Downloads latest source from:
echo    %REPO_URL%
echo  and merges into this folder, preserving:
echo    - database\redmushroom.db   (student data)
echo    - node_modules\             (deps)
echo    - .tools\node22\            (portable Node)
echo.
echo  Please STOP the running 'npm start' window first.
echo  Press any key when stopped, or Ctrl+C to abort.
pause > nul

REM ---- Clean up previous temp ----
if exist "%TMP_DIR%" rmdir /S /Q "%TMP_DIR%" 2>nul
if exist "%TMP_ZIP%" del /F /Q "%TMP_ZIP%" 2>nul

REM ---- Download ZIP ----
echo.
echo  [1/4] Downloading latest source from GitHub ...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ProgressPreference='SilentlyContinue'; try { Invoke-WebRequest -UseBasicParsing -Uri '%ZIP_URL%' -OutFile '%TMP_ZIP%' } catch { Write-Host '[X] Download failed:' $_; exit 1 }"
if errorlevel 1 (
    echo  [X] Cannot reach GitHub. Check internet connection.
    pause
    exit /b 1
)
for %%I in ("%TMP_ZIP%") do echo       downloaded %%~zI bytes

REM ---- Extract ----
echo.
echo  [2/4] Extracting ZIP ...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Expand-Archive -Force -Path '%TMP_ZIP%' -DestinationPath '%TMP_DIR%'"
if errorlevel 1 (
    echo  [X] Extract failed.
    pause
    exit /b 1
)
REM ZIP contains a single subfolder named "RedMushroom-main"
for /d %%d in ("%TMP_DIR%\RedMushroom-*") do set "SRC_DIR=%%d"
if not defined SRC_DIR (
    echo  [X] Unexpected ZIP structure - cannot find extracted folder.
    pause
    exit /b 1
)
echo       source: %SRC_DIR%

REM ---- Merge using robocopy (preserve protected files) ----
echo.
echo  [3/4] Merging source files (preserving DB / node_modules / .tools) ...
robocopy "%SRC_DIR%" "%CD%" /E /XO /NFL /NDL /NP ^
  /XD node_modules .tools .git dist build playwright-report test-results .vscode ^
  /XF *.db *.db-wal *.db-shm .db-version *.log .env ".env.local" ".env.production"
REM robocopy exit codes 0-7 = success; >=8 = failure
if errorlevel 8 (
    echo  [X] robocopy failed with code %ERRORLEVEL%.
    pause
    exit /b 1
)

REM ---- Cleanup ----
echo.
echo  [4/4] Cleanup ...
rmdir /S /Q "%TMP_DIR%" 2>nul
del /F /Q "%TMP_ZIP%" 2>nul
echo       done.

echo.
echo  =============================================
echo   Update complete.
echo  =============================================
echo.
echo  IMPORTANT: if package.json or backend deps
echo  changed, you may need to re-run reinstall.bat
echo  (only if start.bat shows 'cannot find module'
echo  or ABI errors after this update).
echo.
echo  Next steps:
echo    1. Double-click start.bat
echo       (backend auto-runs new schema migrations)
echo    2. Hard-refresh browser: Ctrl+Shift+R
echo    3. Optionally:
echo       - add-extended.bat       (add new questions)
echo       - fix-sorting-alt.bat    (sorting alt answers)
echo.
pause
