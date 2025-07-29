@echo off
echo ================================
echo Docker AISHA Reset Script
echo ================================
echo.

echo 1. Stopping containers...
docker-compose down

echo.
echo 2. Removing Docker images and cache...
docker system prune -f

echo.
echo 3. Building containers without cache...
docker-compose build --no-cache

echo.
echo 4. Starting containers...
docker-compose up -d

echo.
echo 5. Showing container status...
docker-compose ps

echo.
echo 6. Showing React container logs...
timeout /t 5 /nobreak > nul
docker-compose logs react

echo.
echo ================================
echo Script completed!
echo ================================
echo.
echo Check localhost:5173 in your browser
echo Press any key to exit...
pause > nul
