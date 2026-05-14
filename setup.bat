@echo off
setlocal EnableDelayedExpansion
title Setup - EncuestasVet (entorno de desarrollo)

echo ============================================================
echo  Setup de EncuestasVet - entorno de desarrollo
echo ============================================================
echo.

:: ── 1. Verificar Python ───────────────────────────────────────
echo [1/5] Verificando Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python no esta instalado o no esta en el PATH.
    echo Descargalo desde https://www.python.org/downloads/
    echo Asegurate de marcar "Add Python to PATH" durante la instalacion.
    pause
    exit /b 1
)
for /f "tokens=2 delims= " %%v in ('python --version 2^>^&1') do set PY_VER=%%v
echo    OK - Python %PY_VER%
echo.

:: ── 2. Verificar Node.js ──────────────────────────────────────
echo [2/5] Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js no esta instalado o no esta en el PATH.
    echo Descargalo desde https://nodejs.org/ ^(version LTS recomendada^)
    pause
    exit /b 1
)
for /f %%v in ('node --version 2^>^&1') do set NODE_VER=%%v
echo    OK - Node.js %NODE_VER%
echo.

:: ── 3. Entorno virtual Python ─────────────────────────────────
echo [3/5] Configurando entorno virtual Python...
if not exist ".venv\Scripts\activate.bat" (
    echo    Creando .venv...
    python -m venv .venv
    if errorlevel 1 (
        echo ERROR: No se pudo crear el entorno virtual.
        pause
        exit /b 1
    )
) else (
    echo    .venv ya existe, reutilizando.
)

echo    Instalando dependencias Python...
call .venv\Scripts\activate.bat
pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo ERROR: Fallo la instalacion de dependencias Python.
    pause
    exit /b 1
)
echo    OK
echo.

:: ── 4. Dependencias Node / React ──────────────────────────────
echo [4/5] Instalando dependencias del frontend React...
pushd frontend
call npm install --silent
if errorlevel 1 (
    echo ERROR: Fallo npm install en /frontend.
    popd
    pause
    exit /b 1
)
popd
echo    OK
echo.

:: ── 5. Archivos de configuracion e instancia ──────────────────
echo [5/5] Preparando archivos de configuracion...

if not exist "config.json" (
    copy "config.example.json" "config.json" >nul
    echo    config.json creado a partir de config.example.json.
    echo    ^!^! Edita config.json y cambia ADMIN_TOKEN antes de usar.
) else (
    echo    config.json ya existe, sin cambios.
)

if not exist "instance" mkdir instance
if not exist "instance\exports" mkdir instance\exports
echo    Carpeta instance/ lista.
echo.

:: ── Resumen ───────────────────────────────────────────────────
echo ============================================================
echo  Setup completado exitosamente!
echo ============================================================
echo.
echo  Para correr la app en modo desarrollo:
echo.
echo    1. Backend Flask  ^(terminal 1^):
echo       .venv\Scripts\activate
echo       python app.py
echo.
echo    2. Frontend React ^(terminal 2^):
echo       cd frontend
echo       npm start
echo.
echo  La UI estara disponible en:
echo    http://localhost:3000   ^(React dev^)
echo    http://127.0.0.1:5000  ^(Flask API^)
echo.
echo  Panel de resultados ^(admin^):
echo    http://127.0.0.1:5000/results/main_encuesta?admin_token=TU_TOKEN
echo.
pause
