@echo off
setlocal EnableDelayedExpansion

:: -----------------------------------------------------------------------------
:: RoomCanvas AI - Development Launcher
:: -----------------------------------------------------------------------------
pushd "%~dp0"

:: Switch to UTF-8 to support box drawing characters
chcp 65001 >nul

:: Set terminal window size
mode con: cols=78 lines=30

:: Enable ANSI colors
for /F "delims=#" %%E in ('"prompt #$E# & for %%E in (1) do rem"') do set "ESC=%%E"
set "RED=%ESC%[91m"
set "GREEN=%ESC%[92m"
set "YELLOW=%ESC%[93m"
set "CYAN=%ESC%[96m"
set "RESET=%ESC%[0m"

title RoomCanvas AI Development Launcher

echo.
echo %CYAN%╔══════════════════════════════════════════════════════╗%RESET%
echo %CYAN%║                 RoomCanvas AI Launcher              ║%RESET%
echo %CYAN%╚══════════════════════════════════════════════════════╝%RESET%
echo.

:: 1. Free ports safely
echo %YELLOW%[1/5]%RESET% Cleaning previous processes...
call :KillPorts
echo       %GREEN%✓ Ports 3000 and 8000 available%RESET%
echo.

:: 2. Start Backend
echo %YELLOW%[2/5]%RESET% Starting Backend...
pushd backend
start "RoomCanvas Backend" cmd /k "call .\venv\Scripts\activate.bat && uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
popd

:: 3. Wait for Backend
call :WaitForBackend
if errorlevel 1 goto :FatalError
echo       %GREEN%✓ Backend running%RESET%
echo.

:: 4. Start Frontend
echo %YELLOW%[3/5]%RESET% Starting Frontend...
pushd frontend
start "RoomCanvas Frontend" cmd /k "npm run dev"
popd

:: 5. Wait for Frontend
call :WaitForFrontend
if errorlevel 1 goto :FatalError
echo       %GREEN%✓ Frontend running%RESET%
echo.

:: 6. Verify Services & Launch Browser
echo %YELLOW%[4/5]%RESET% Verifying services...
echo       %GREEN%✓ Backend  http://127.0.0.1:8000%RESET%
echo       %GREEN%✓ Frontend http://localhost:3000%RESET%
echo.

echo %YELLOW%[5/5]%RESET% Launching browser...
start http://localhost:3000
echo       %GREEN%✓ Browser opened%RESET%
echo.

:: 7. Summary
echo %GREEN%────────────────────────────────────────────────────────%RESET%
echo.
echo           %GREEN%RoomCanvas is Ready%RESET%
echo.
echo   Backend   : %CYAN%http://127.0.0.1:8000%RESET%
echo   Frontend  : %CYAN%http://localhost:3000%RESET%
echo.
echo %GREEN%────────────────────────────────────────────────────────%RESET%
echo.
echo Press any key to close this launcher...
popd
pause >nul
exit /b 0

:: -----------------------------------------------------------------------------
:: Functions
:: -----------------------------------------------------------------------------

:KillPorts
for %%P in (3000 8000) do (
    for /f "tokens=5" %%A in ('netstat -aon ^| findstr :%%P ^| findstr LISTENING 2^>nul') do (
        call :CheckAndKill %%A
    )
)
exit /b 0

:CheckAndKill
tasklist /fi "PID eq %1" 2^>nul | findstr /i "node.exe python.exe" >nul
if not errorlevel 1 (
    taskkill /F /PID %1 >nul 2>&1
)
exit /b 0

:WaitForBackend
set RETRIES=0
:HttpBackendLoop
curl -fs http://127.0.0.1:8000/api/health >nul 2>&1
if not errorlevel 1 exit /b 0
set /a RETRIES+=1
if %RETRIES% geq 30 exit /b 1
timeout /t 1 /nobreak >nul
goto HttpBackendLoop

:WaitForFrontend
set RETRIES=0
:HttpFrontendLoop
netstat -aon | findstr :3000 | findstr LISTENING >nul 2>&1
if not errorlevel 1 exit /b 0
set /a RETRIES+=1
if %RETRIES% geq 30 exit /b 1
timeout /t 1 /nobreak >nul
goto HttpFrontendLoop

:FatalError
echo.
echo %RED%✗ Startup failed.%RESET%
echo.
echo Check the Backend or Frontend terminal for the actual error.
echo.
popd
pause
exit /b 1
