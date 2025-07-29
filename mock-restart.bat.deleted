@echo off
echo ================================
echo Mock Server Restart with Data
echo ================================
echo.

echo 1. Stopping Mock server...
docker-compose stop mock

echo.
echo 2. Rebuilding Mock server...
docker-compose build mock

echo.
echo 3. Starting Mock server...
docker-compose up -d mock

echo.
echo 4. Checking Mock server status...
docker-compose ps mock

echo.
echo 5. Testing endpoints...
timeout /t 3 /nobreak > nul

echo.
echo Testing charge-options endpoint:
curl -s http://localhost:4000/api/charge-options
echo.
echo.

echo Testing public-timeline endpoint:
curl -s http://localhost:4000/api/public-timeline | head -c 200
echo "..."
echo.

echo.
echo 6. Mock server logs:
docker-compose logs mock --tail=10

echo.
echo ================================
echo Mock server restart completed!
echo ================================
echo.
echo Now the Mock API has sample data:
echo - 3 charge options (pricing plans)
echo - 3 public timeline images
echo.
echo Refresh your browser at localhost:5173
pause
