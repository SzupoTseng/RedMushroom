@echo off
chcp 65001 > nul
title RedMushroom: update from git
cd /d "%~dp0"

if exist ".tools\node22\node.exe" set "PATH=%CD%\.tools\node22;%PATH%"

echo.
echo  =============================================
echo   RedMushroom Update
echo  =============================================
echo.
echo  This will update the source code only.
echo  Your database (student scores, settings) will
echo  be preserved.
echo.
echo  WHAT IS NOT TOUCHED:
echo    - database\redmushroom.db (student data)
echo    - node_modules\           (deps stay)
echo    - .tools\node22\          (portable Node)
echo.

REM ---- Stop running backend if any ----
echo  Please STOP the running 'npm start' window first.
echo  Press any key when stopped, or Ctrl+C to abort.
pause > nul

REM ---- Check for git ----
where git > nul 2>&1
if errorlevel 1 (
    echo  [X] git is not installed on this machine.
    echo      Install it from https://git-scm.com
    echo      OR copy files manually from the main PC,
    echo      excluding: node_modules, .tools, database\*.db
    pause
    exit /b 1
)

REM ---- Must be a git repo ----
if not exist ".git" (
    echo  [X] This folder is not a git clone.
    echo      Either clone via:
    echo        git clone https://github.com/YOUR/repo.git
    echo      OR copy files manually, excluding:
    echo        node_modules, .tools, database\*.db
    pause
    exit /b 1
)

echo.
echo  [1/4] Saving local DB version marker (preserve student data) ...
if exist "database\.db-version" copy "database\.db-version" "database\.db-version.bak" > nul

echo  [2/4] Running git pull ...
call git pull
if errorlevel 1 (
    echo  [X] git pull failed. Check error above.
    echo      If you have local edits, commit or stash first:
    echo        git stash
    echo        git pull
    echo        git stash pop
    pause
    exit /b 1
)

REM ---- Check if package.json changed (need npm install) ----
echo.
echo  [3/4] Checking if dependencies changed ...
git diff HEAD@{1} HEAD --name-only > "%TEMP%\rm-changed.txt"
findstr /C:"package.json" "%TEMP%\rm-changed.txt" > nul 2>&1
if not errorlevel 1 (
    echo       package.json changed - reinstalling deps ^(may take a few minutes^)...
    call npm install
    if errorlevel 1 ( echo  [X] root npm install failed. & pause & exit /b 1 )
    call npm install --prefix backend
    if errorlevel 1 ( echo  [X] backend npm install failed. & pause & exit /b 1 )
    call npm install --prefix frontend
    if errorlevel 1 ( echo  [X] frontend npm install failed. & pause & exit /b 1 )
    call npm install --prefix scripts
    if errorlevel 1 ( echo  [X] scripts npm install failed. & pause & exit /b 1 )
) else (
    echo       dependencies unchanged - skipping npm install.
)
del "%TEMP%\rm-changed.txt" 2>nul

echo.
echo  [4/4] Done. Summary:
echo       - Source code updated.
echo       - DB preserved at database\redmushroom.db
echo       - Backend will auto-run migrations on next start.
echo.
echo  Next steps:
echo    1. Double-click start.bat  (backend will run new migrations)
echo    2. Hard-refresh browser    (Ctrl+Shift+R) to load new frontend
echo    3. If new seed data is included, optionally double-click:
echo         add-extended.bat       (adds new questions to DB)
echo         fix-sorting-alt.bat    (fixes sorting alt answers)
echo.
echo  =============================================
pause
