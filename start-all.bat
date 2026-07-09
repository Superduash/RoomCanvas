@echo off
setlocal EnableDelayedExpansion

title RoomCanvas AI Launcher
color 0A

echo ============================================================
echo                RoomCanvas AI Launcher
echo ============================================================
echo.

:: -------------------------------
:: Kill existing processes
:: -------------------------------
echo [1/5] Clearing ports...

for %%P in (3000 8000) do (
    for /f "tokens=5" %%A in ('netstat -aon ^| findstr :%%P ^| findstr LISTENING') do (
        echo     Killing PID %%A on port %%P...
        taskkill /F /PID %%A >nul 2>&1
    )
)

echo     Ports cleared.
echo.

:: -------------------------------
:: Backend
:: -------------------------------
echo [2/5] Starting Backend...

pushd backend

start "RoomCanvas Backend" cmd /k ^
".\venv\Scripts\uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

popd

echo     Waiting for backend...

:WAIT_BACKEND

timeout /t 1 /nobreak >nul

netstat -ano | findstr ":8000" | findstr LISTENING >nul

if errorlevel 1 (
    goto WAIT_BACKEND
)

echo     Backend ready.
echo.

:: -------------------------------
:: Frontend
:: -------------------------------
echo [3/5] Starting Frontend...

pushd frontend

start "RoomCanvas Frontend" cmd /k ^
"npm run dev"

popd

echo     Waiting for frontend...

:WAIT_FRONTEND

timeout /t 1 /nobreak >nul

netstat -ano | findstr ":3000" | findstr LISTENING >nul

if errorlevel 1 (
    goto WAIT_FRONTEND
)

echo     Frontend ready.
echo.

:: -------------------------------
:: Browser
:: -------------------------------
echo [4/5] Opening browser...

start http://localhost:3000

echo.

:: -------------------------------
:: Done
:: -------------------------------
echo ============================================================
echo                RoomCanvas Started Successfully
echo ============================================================
echo.
echo Backend : http://127.0.0.1:8000
echo API Docs: http://127.0.0.1:8000/docs
echo Frontend: http://localhost:3000
echo.
echo Close the Backend and Frontend windows to stop the servers.
echo.

pause