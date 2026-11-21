@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%\..\.."

if exist "venv\Scripts\python.exe" (
    set "PYTHON_EXE=venv\Scripts\python.exe"
) else (
    set "PYTHON_EXE=python"
)

echo ==================================================
echo   Scenery Grid Kalibrasyon Studyosu
echo   URL: http://127.0.0.1:8765
echo ==================================================
echo.

start "" /min cmd /c "ping -n 2 127.0.0.1 >nul & start "" http://127.0.0.1:8765"
"%PYTHON_EXE%" "%SCRIPT_DIR%server.py" --port 8765 %*

popd
endlocal
