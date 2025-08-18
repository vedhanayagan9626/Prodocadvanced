@echo off
echo ==============================
echo   Cleaning old build folders
echo ==============================
rmdir /s /q build 2>nul
rmdir /s /q dist 2>nul

echo ==============================
echo   Removing __pycache__ folders
echo ==============================
for /d /r . %%d in (__pycache__) do (
    if exist "%%d" rmdir /s /q "%%d"
)

echo ==============================
echo   Clearing pip cache
echo ==============================
pip cache purge

echo ==============================
echo   Installing dependencies fresh
echo ==============================
pip install -r requirements.txt --no-cache-dir

echo ==============================
echo   Building ProDoc executable
echo ==============================
pyinstaller ProDoc.spec --noconfirm --clean 

echo ==============================
echo   Build finished!
echo   Your exe is in dist\ProDoc
echo ==============================

pause
