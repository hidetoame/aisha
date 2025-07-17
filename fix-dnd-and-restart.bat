@echo off
echo Removing package-lock.json and node_modules...
cd /d "C:\Users\hidet\Documents\AISHA\react_project"
if exist package-lock.json del package-lock.json
if exist node_modules rmdir /s /q node_modules

echo.
echo Stopping containers...
docker-compose --env-file .env down

echo.
echo Building containers without cache...
docker-compose --env-file .env build --no-cache

echo.
echo Starting containers...
docker-compose --env-file .env up -d

echo.
echo Waiting for containers to start...
timeout /t 15 /nobreak > nul

echo.
echo Checking status...
docker-compose --env-file .env ps

echo.
echo Done! Check the browser at http://localhost:5173
pause
