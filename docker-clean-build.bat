@echo off
echo ================================
echo Clean Mock Server Build
echo ================================
echo.

echo 1. Removing existing node_modules...
if exist "mock_server\node_modules" (
    rmdir /s /q "mock_server\node_modules"
    echo Node modules removed
) else (
    echo No node_modules found
)

echo.
echo 2. Stopping all containers...
docker-compose down

echo.
echo 3. Cleaning Docker build cache...
docker builder prune -f

echo.
echo 4. Building containers...
docker-compose build --no-cache

echo.
echo 5. Starting all containers...
docker-compose up -d

echo.
echo 6. Checking container status...
docker-compose ps

echo.
echo 7. Showing logs...
timeout /t 5 /nobreak > nul

echo.
echo Mock server logs:
docker-compose logs mock --tail=15

echo.
echo React logs:
docker-compose logs react --tail=10

echo.
echo ================================
echo Build completed!
echo ================================
echo.
echo Services:
echo - React: http://localhost:5173
echo - Mock API: http://localhost:4000
echo - Django API: http://localhost:7999
echo - PostgreSQL: localhost:5431
echo.
pause
