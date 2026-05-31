@echo off
chcp 65001 > nul
title RedMushroom: add extended questions
cd /d "%~dp0"

REM Use portable Node 22 LTS if present (so better-sqlite3 ABI matches).
if exist ".tools\node22\node.exe" set "PATH=%CD%\.tools\node22;%PATH%"

echo.
echo  =============================================
echo   Add Extended Questions (non-destructive)
echo  =============================================
echo.
echo  This script INSERTs new questions into the
echo  existing database. It does NOT delete anything.
echo  Safe to re-run; INSERT OR IGNORE prevents
echo  duplicates.
echo.

if not exist "database\redmushroom.db" (
    echo  [X] database\redmushroom.db not found.
    echo      Please run start.bat or reseed-db.bat first.
    pause
    exit /b 1
)

echo  Running scripts\seed-extended.ts ...
echo.
call npx tsx scripts/seed-extended.ts
if errorlevel 1 (
    echo.
    echo  [X] Failed. See messages above.
    pause
    exit /b 1
)

echo.
echo  =============================================
echo   Done. New questions are now in the database.
echo  =============================================
pause
