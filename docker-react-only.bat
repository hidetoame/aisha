@echo off
echo ================================
echo React Only (No Mock Server)
echo ================================
echo.

echo 1. Stopping all containers...
docker-compose down

echo.
echo 2. Starting essential services only...
docker-compose up -d db web react

echo.
echo 3. Checking container status...
docker-compose ps

echo.
echo 4. React logs:
docker-compose logs react --tail=10

echo.
echo ================================
echo React is running without Mock API
echo ================================
echo.
echo Services:
echo - React: http://localhost:5173
echo - Django API: http://localhost:7999
echo - PostgreSQL: localhost:5431
echo.
echo Note: Mock API is disabled, some features may not work
pause
