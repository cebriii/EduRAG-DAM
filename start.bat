@echo off
title EduRAG - Iniciando...

echo.
echo  ==========================================
echo   EduRAG - Tutor Socratico DAM2
echo  ==========================================
echo.

:: Verificaciones previas
if not exist "%~dp0backend\.venv\Scripts\python.exe" (
    echo  [ERROR] Entorno virtual no encontrado en backend\.venv
    echo.
    echo  Ejecuta esto una sola vez para crearlo:
    echo    cd backend
    echo    python -m venv .venv
    echo    .venv\Scripts\pip install -r requirements.txt
    echo.
    pause
    exit /b 1
)

if not exist "%~dp0backend\.env" (
    echo  [ERROR] No se encuentra backend\.env con la GEMINI_API_KEY
    echo.
    pause
    exit /b 1
)

if not exist "%~dp0frontend\node_modules" (
    echo  [ERROR] Dependencias del frontend no instaladas.
    echo.
    echo  Ejecuta esto una sola vez:
    echo    cd frontend
    echo    npm install
    echo.
    pause
    exit /b 1
)

:: Arranque de servicios
echo  [1/3] Arrancando backend  (puerto 8000)...
start "EduRAG-Backend" /min cmd /k "cd /d %~dp0backend && .venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000"

echo  [2/3] Arrancando frontend (puerto 5173)...
start "EduRAG-Frontend" /min cmd /k "cd /d %~dp0frontend && npm run dev"

echo  [3/3] Esperando que los servicios arranquen...
timeout /t 5 /nobreak >nul

:: Abrir navegador
start "" "http://localhost:5173"

echo.
echo  ==========================================
echo   EduRAG listo en localhost:5173
echo  ==========================================
echo.
echo  Backend:   http://localhost:8000
echo  Frontend:  http://localhost:5173
echo.
echo  Para detener la aplicacion, cierra las ventanas
echo  minimizadas "EduRAG-Backend" y "EduRAG-Frontend",
echo  o ejecuta stop.bat
echo.
pause
