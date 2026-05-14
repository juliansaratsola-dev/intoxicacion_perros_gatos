@echo off
setlocal
title Compilar EncuestasVet.exe

echo ============================================================
echo  Compilador de EncuestasVet (PyInstaller)
echo ============================================================
echo.

:: Verificar que existe el entorno virtual
if not exist ".venv\Scripts\activate.bat" (
    echo ERROR: No se encontro el entorno virtual ".venv".
    echo.
    echo Ejecuta primero:
    echo   python -m venv .venv
    echo   .venv\Scripts\pip install -r requirements.txt
    echo.
    pause
    exit /b 1
)

echo [1/3] Activando entorno virtual...
call .venv\Scripts\activate.bat

echo [2/3] Instalando PyInstaller...
pip install pyinstaller --quiet

echo [2b/3] Construyendo el frontend React...
pushd frontend
call npm install --silent
call npm run build
popd
if not exist "frontend\build\index.html" (
    echo ERROR: El build de React fallo. Revisa los mensajes de arriba.
    pause
    exit /b 1
)

echo [3/3] Compilando ejecutable (puede tardar unos minutos)...
echo.
pyinstaller --onefile ^
  --add-data "templates;templates" ^
  --add-data "static;static" ^
  --add-data "surveys;surveys" ^
  --add-data "frontend\build;frontend_build" ^
  --name EncuestasVet ^
  --icon NONE ^
  app.py

if errorlevel 1 (
    echo.
    echo ERROR: La compilacion fallo. Revisa los mensajes de arriba.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  Listo! Ejecutable generado en: dist\EncuestasVet.exe
echo  Ahora ejecuta  package.bat  para crear el ZIP distribuible.
echo ============================================================
echo.
pause
endlocal
