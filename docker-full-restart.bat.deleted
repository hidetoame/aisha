@echo off
echo ================================
echo Full Docker Restart with Mock
echo ================================
echo.

echo 1. Stopping all containers...
docker-compose down

echo.
echo 2. Building all containers...
docker-compose build

echo.
echo 3. Starting all containers...
docker-compose up -d

echo.
echo 4. Checking container status...
docker-compose ps

echo.
echo 5. Showing logs...
timeout /t 3 /nobreak > nul

echo.
echo Mock server logs:
docker-compose logs mock --tail=10

echo.
echo React logs:
docker-compose logs react --tail=10

echo.
echo ================================
echo All services started!
echo ================================
echo.
echo Services:
echo - React: http://localhost:5173
echo - Mock API: http://localhost:4000
echo - Django API: http://localhost:7999
echo - PostgreSQL: localhost:5431
echo.
pause
