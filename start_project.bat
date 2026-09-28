@echo off
chcp 65001 > nul
echo =====================================================================
echo    KHOI DONG HE THONG SMART BUS TICKETING - UNIFIED ECOSYSTEM
echo =====================================================================
echo.
echo [1/2] Dang khoi chay Backend Server FastAPI (Port 8000)...
start "SmartBus - Backend (FastAPI)" cmd /k "python main.py"

echo [2/2] Dang khoi chay Frontend React Vite (Port 5173)...
start "SmartBus - Frontend (React Vite)" cmd /k "npm --prefix ve-xe-frontend run dev"

echo.
echo =====================================================================
echo He thong dang duoc khoi chay tren:
echo -> Backend API Docs: http://127.0.0.1:8000/docs
echo -> Frontend Web App: http://localhost:5173
echo =====================================================================
timeout /t 3 > nul
start http://localhost:5173
