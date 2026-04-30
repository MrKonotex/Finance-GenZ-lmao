@echo off
setlocal

set ROOT=%~dp0
echo Starting Finance GenZ...

REM === Backend ================================================================
cd /d "%ROOT%backend"

if not exist ".venv" (
    echo [backend] Creating virtual environment...
    python -m venv .venv
    if errorlevel 1 (
        echo ERROR: Failed to create venv. Is Python 3.12+ installed and on PATH?
        exit /b 1
    )
)

echo [backend] Installing dependencies...
.venv\Scripts\pip.exe install -q -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install backend dependencies.
    exit /b 1
)

echo [backend] Starting FastAPI on http://localhost:8000 ...
start "Finance GenZ Backend" cmd /k ".venv\Scripts\uvicorn.exe main:app --host 0.0.0.0 --port 8000 --reload"

REM === Frontend ===============================================================
cd /d "%ROOT%frontend"

if not exist "node_modules" (
    echo [frontend] Installing npm dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install frontend dependencies. Is Node.js installed?
        exit /b 1
    )
)

echo [frontend] Starting Vite dev server on http://localhost:5173 ...
start "Finance GenZ Frontend" cmd /k "npm run dev"

echo.
echo ============================================================
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5173
echo   API docs: http://localhost:8000/docs
echo ============================================================
echo.
echo Two terminal windows opened. Close them to stop the servers.
echo.
pause
