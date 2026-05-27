@echo off
setlocal enabledelayedexpansion
REM ============================================================
REM  RedMushroom - reset and re-seed the LOCAL SQLite database.
REM
REM  Deletes the old DB (so no duplicate questions), recreates
REM  the schema, runs every seed, then dumps a full report.
REM  EVERYTHING is written to reseed-db.log for review.
REM
REM  Double-click this file, or run:  reseed-db.bat
REM ============================================================

cd /d "%~dp0"
set "LOG=%~dp0reseed-db.log"

echo.
echo ============================================================
echo  RedMushroom - reset ^& re-seed local database
echo  Log file: %LOG%
echo ============================================================
echo.
echo  IMPORTANT: stop "npm start" first (the dev server locks
echo  the database file). Press Ctrl+C now to abort, or
pause

REM --- fresh log + environment dump ---------------------------
> "%LOG%" echo RedMushroom reseed log - %DATE% %TIME%
>>"%LOG%" echo ============================================================
>>"%LOG%" echo --- ENVIRONMENT ---
>>"%LOG%" echo cwd: %CD%
>>"%LOG%" echo node version:
call node -v >> "%LOG%" 2>&1
>>"%LOG%" echo npm version:
call npm -v >> "%LOG%" 2>&1
>>"%LOG%" echo git HEAD:
call git rev-parse --short HEAD >> "%LOG%" 2>&1
>>"%LOG%" echo dictionary present:
if exist "backend\data\dictionary.json" (>>"%LOG%" echo   yes) else (>>"%LOG%" echo   NO - polyphonic readings will be wrong^!)

REM --- 1. delete old DB + WAL/SHM sidecars + markers ----------
call :step "[1/9] Deleting old database"
if exist "database\redmushroom.db"     del /f /q "database\redmushroom.db"     2>>"%LOG%"
if exist "database\redmushroom.db-wal" del /f /q "database\redmushroom.db-wal" 2>>"%LOG%"
if exist "database\redmushroom.db-shm" del /f /q "database\redmushroom.db-shm" 2>>"%LOG%"
if exist "database\.db-version"        del /f /q "database\.db-version"        2>>"%LOG%"
if exist "database\.seeded"            del /f /q "database\.seeded"            2>>"%LOG%"
>>"%LOG%" echo   old DB removed

call :run "[2/9] Creating schema (init-db)"         scripts\init-db.ts
call :run "[3/9] Demo accounts + minimal questions" scripts\seed-minimal.ts
call :run "[4/9] Generating question matrix"        scripts\generate-questions.ts
call :run "[5/9] Taiwan-localized questions"        scripts\seed-questions-taiwan.ts
call :run "[6/9] Math questions"                    scripts\seed-math.ts
call :run "[7/9] Praise library"                    scripts\seed-praise-library.ts
call :run "[8/9] Supplementary questions"           scripts\seed-supplementary.ts
call :run "[9/9] DB report (schema + polyphonic check)" scripts\dump-db-report.ts

echo.
echo ============================================================
echo  DONE. Full report written to:
echo    %LOG%
echo  Now run:  npm start
echo ============================================================
echo.
echo --- last 40 lines of the report ---
powershell -NoProfile -Command "Get-Content -Tail 40 -LiteralPath '%LOG%'" 2>nul
echo.
pause
endlocal
goto :eof

REM ---------- subroutines ----------

REM :step  - echo a marker to both screen and log
:step
echo %~1
>>"%LOG%" echo.
>>"%LOG%" echo === %~1 ===
goto :eof

REM :run   - mark a step, run a tsx script, append stdout+stderr
REM          and the exit code to the log; abort on failure.
:run
call :step %1
call npx tsx %2 >> "%LOG%" 2>&1
set "RC=!errorlevel!"
>>"%LOG%" echo (exit code: !RC!)
if not "!RC!"=="0" goto :failed
goto :eof

:failed
echo.
echo ============================================================
echo  FAILED at the step above. Open the log for details:
echo    %LOG%
echo  Common cause: dev server still running and locking the DB.
echo  Stop it (Ctrl+C in the npm start window) and re-run.
echo ============================================================
echo.
echo --- last 25 lines of the log ---
powershell -NoProfile -Command "Get-Content -Tail 25 -LiteralPath '%LOG%'" 2>nul
echo.
pause
endlocal
exit /b 1
