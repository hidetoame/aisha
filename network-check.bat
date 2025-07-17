@echo off
echo ================================
echo Network and Port Check
echo ================================
echo.

echo Checking port 5173...
netstat -an | findstr :5173
echo.

echo Checking Docker network...
docker network ls
echo.

echo Checking React container inspect...
docker-compose ps react
echo.

echo Trying to access React container directly...
curl -I http://localhost:5173/
echo.

echo Checking if React files are accessible...
docker-compose exec react ls -la /app
echo.

echo Checking React container package.json...
docker-compose exec react cat /app/package.json
echo.

pause
