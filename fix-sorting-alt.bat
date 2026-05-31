@echo off
chcp 65001 > nul
title RedMushroom: fix sorting alt answers
cd /d "%~dp0"

echo.
echo  =============================================
echo   Fix sorting questions: accept reversed order
echo  =============================================
echo.
echo  Adds correct_answer_alt to sorting questions where
echo  subject and object can be swapped (e.g. "I help him"
echo  / "He helps me" both valid).
echo.
echo  Make sure backend is STOPPED (Ctrl+C the npm start
echo  window) before continuing, otherwise DB is locked.
echo.
pause

where python > nul 2>&1
if errorlevel 1 (
    where py > nul 2>&1
    if errorlevel 1 (
        echo  [X] Python not found. Install Python 3 from python.org.
        pause
        exit /b 1
    )
    set PYCMD=py
) else (
    set PYCMD=python
)

%PYCMD% scripts\fix-sorting-alt.py
if errorlevel 1 (
    echo.
    echo  [X] Failed. See messages above.
    pause
    exit /b 1
)

echo.
echo  =============================================
echo   Done. You can restart the backend now.
echo  =============================================
pause
