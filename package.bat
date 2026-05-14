@echo off
setlocal
title Empaquetar EncuestasVet

set OUT=EncuestasVet-Windows

echo ============================================================
echo  Empaquetando distribucion: %OUT%.zip
echo ============================================================
echo.

:: Verificar que el exe fue compilado
if not exist "dist\EncuestasVet.exe" (
    echo ERROR: No se encontro dist\EncuestasVet.exe
    echo Ejecuta primero  build_exe.bat
    pause
    exit /b 1
)

:: Limpiar y crear carpeta de salida
echo [1/4] Preparando carpeta de salida...
rd /s /q %OUT% 2>nul
mkdir %OUT%

echo [2/4] Copiando archivos...
copy "dist\EncuestasVet.exe" "%OUT%\" >nul
xcopy "surveys" "%OUT%\surveys" /E /I /Q >nul
:: Usar config.example.json como base (sin token real) para que el destinatario lo configure
copy "config.example.json" "%OUT%\config.json" >nul
copy "LEEME.txt" "%OUT%\" >nul

:: Crear carpeta instance vacia (la app guarda la BD ahi)
mkdir "%OUT%\instance" 2>nul

echo [3/4] Creando ZIP...
powershell -NoProfile -Command ^
  "Compress-Archive -Path '%OUT%\*' -DestinationPath '%OUT%.zip' -Force"

if errorlevel 1 (
    echo ERROR: No se pudo crear el ZIP.
    pause
    exit /b 1
)

echo [4/4] Limpiando carpeta temporal...
rd /s /q %OUT% 2>nul

echo.
echo ============================================================
echo  Paquete listo: %OUT%.zip
echo  Distribuye este ZIP a los estudiantes.
echo ============================================================
echo.
pause
endlocal
