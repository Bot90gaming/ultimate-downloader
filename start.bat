@echo off
setlocal enabledelayedexpansion
title Ultimate Downloader - Dev Server

echo ========================================================
echo   ULTIMATE DOWNLOADER - Cross-Platform Media Hub
echo   Universal Video and Image Extractor
echo ========================================================
echo.

:: 1. Check Node.js
echo [1/4] Checking Node.js environment...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not found in PATH!
    echo Please download and install Node.js 22 LTS or 20 LTS from:
    echo   https://nodejs.org/
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo       Found Node.js %NODE_VER%

:: 2. Check npm
echo [2/4] Checking npm package manager...
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not found in PATH!
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('npm -v') do set NPM_VER=%%v
echo       Found npm v%NPM_VER%

:: 3. Check FFmpeg
echo [3/4] Checking FFmpeg audio/video tools...
where ffmpeg >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] ffmpeg was not detected in your PATH!
    echo High-resolution muxing and audio conversions may be limited.
    echo To install FFmpeg on Windows, run in PowerShell:
    echo   winget install Gyan.FFmpeg
    echo   or: choco install ffmpeg
    echo Continuing startup with fallback mode...
) else (
    echo       Found FFmpeg
)

:: 4. Ensure downloads directory exists
if not exist "downloads" (
    mkdir downloads
)

:: 5. Install Dependencies if needed
echo [4/4] Verifying project dependencies...
if not exist "node_modules\" (
    echo       Installing workspace dependencies...
    call npm install
) else if not exist "client\node_modules\" (
    echo       Installing client dependencies...
    call npm install
) else if not exist "server\node_modules\" (
    echo       Installing server dependencies...
    call npm install
) else (
    echo       Dependencies up to date.
)

echo.
echo ========================================================
echo   Launching Ultimate Downloader Development Servers...
echo   - Backend Server: http://localhost:4000
echo   - Web Interface:  http://localhost:5173
echo.
echo   Press Ctrl+C to terminate both services.
echo ========================================================
echo.

:: Launch default browser to dev URL after waiting 3 seconds
start "" /b cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:5173"

:: Start concurrently
call npm run dev

pause
