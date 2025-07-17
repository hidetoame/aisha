@echo off
echo ================================
echo API Connection Test
echo ================================
echo.

echo 1. Checking running containers...
docker-compose ps

echo.
echo 2. Testing Mock API endpoint...
curl -s http://localhost:4000/api/charge-options
echo.

echo.
echo 3. Testing Django API endpoint...
curl -s http://localhost:7999/api/
echo.

echo.
echo 4. Mock server logs...
docker-compose logs mock --tail=10

echo.
echo 5. React logs...
docker-compose logs react --tail=5

echo.
echo ================================
echo API test completed!
echo ================================
pause
