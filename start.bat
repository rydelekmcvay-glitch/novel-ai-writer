@echo off
echo Starting Novel AI Writer...
echo.
echo [1/2] Starting backend on http://localhost:3001
start "Backend" cmd /k "cd /d %~dp0backend && npm run dev"
timeout /t 2 /nobreak > nul
echo [2/2] Starting frontend on http://localhost:5173
start "Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
echo.
echo Both servers are starting. Open http://localhost:5173 in your browser.
pause
