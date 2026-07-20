@echo off
del /f /q .git\index.lock 2>nul
git add src\ .gitignore package.json 2>nul
if %errorlevel% equ 0 (
    echo SUCCESS: Files staged successfully
) else (
    echo ERROR: Failed to stage files
)