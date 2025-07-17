@echo off
echo Stopping and removing containers...
docker-compose --env-file .env down

echo Building containers without cache...
docker-compose --env-file .env build --no-cache

echo Starting containers in background...
docker-compose --env-file .env up -d

echo Waiting for containers to start...
timeout /t 10 /nobreak > nul

echo Checking status...
docker-compose --env-file .env ps

echo.
echo Containers are ready!
echo Frontend: http://localhost:5173
echo Backend: http://localhost:7999
echo Database: localhost:5431
pause
