@echo off
setlocal enabledelayedexpansion

title RoomCanvas AI Launcher

echo ===================================================
echo       RoomCanvas AI - Startup Script
echo ===================================================
echo.

echo [1/3] Checking and freeing ports 3000 and 8000...
for %%p in (3000 8000) do (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%%p ^| findstr LISTENING') do (
        taskkill /F /PID %%a >nul 2>&1
    )
)
echo       Ports are clear.
echo.

echo [2/3] Starting Backend Server...
cd backend
:: Uses cmd /k so if there's an error, the window stays open for you to read it.
start "RoomCanvas AI - Backend" cmd /k ".\venv\Scripts\uvicorn app.main:app --host 127.0.0.1 --port 8000 --log-level warning"
cd ..

:: Wait 4 seconds to ensure backend is fully up before frontend hits it
timeout /t 4 /nobreak >nul
echo       Backend launched in a new window.
echo.

echo [3/3] Starting Frontend Server...
cd frontend
start "RoomCanvas AI - Frontend" cmd /k "npm run dev -- --clearScreen false"
cd ..
echo       Frontend launched in a new window.
echo.

echo ===================================================
echo   All systems go!
echo   Opening http://localhost:3000 in your browser...
echo ===================================================
timeout /t 2 /nobreak >nul
start http://localhost:3000

echo.
echo Press any key to exit this launcher window...
pause >nul
