@echo off
REM Regenera data.js a partir de las carpetas de img/
cd /d "%~dp0"
node generar-data.js
echo.
echo ---------------------------------------------
echo Listo. Abri (o refresca con Ctrl+F5) index.html
echo ---------------------------------------------
pause
