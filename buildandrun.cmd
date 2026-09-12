@echo off
echo =========================================
echo 1. Building Vue Client PWA Assets...
echo =========================================
cd client
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed! Stopping process.
    pause
    exit /b %errorlevel%
)

echo.
echo =========================================
echo 2. Returning to Parent Folder ^& Starting Server...
echo =========================================
cd ..
node server.js
pause