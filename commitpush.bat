@echo off
REM Commit and push helper.
REM Usage: commitpush.bat ["commit message"]
REM If no message is given, a timestamped default is used.

setlocal

set MSG=%~1
if "%MSG%"=="" set "MSG=Auto commit: %date% %time%"

echo Adding changes...
git add -A

set CHANGED=0
for /f %%i in ('git status --porcelain') do set CHANGED=1

if "%CHANGED%"=="0" (
    echo No changes to commit. Nothing to push.
    exit /b 0
)

echo.
echo Staged files:
git status --short
echo.

echo Committing...
git commit -m "%MSG%"
if errorlevel 1 (
    echo Commit failed.
    exit /b 1
)

echo Pushing...
git push origin HEAD
if errorlevel 1 (
    echo Push failed.
    exit /b 1
)

echo.
echo Done.