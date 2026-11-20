@echo off
title AIMF Backend + Online Tunnel Launcher
color 0A
cd /d "%~dp0"

echo.
echo  ======================================================
echo     AIMF -- Adaptive Intelligent Memory Firewall
echo     Starting Backend and Online Vercel Tunnel...
echo  ======================================================
echo.

if exist "backend\.venv\Scripts\python.exe" (
    "backend\.venv\Scripts\python.exe" run_online.py
) else (
    python run_online.py
)

if %errorlevel% neq 0 (
    echo.
    echo  [!] An error occurred while running AIMF.
)

pause
