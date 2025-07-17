@echo off
echo ================================
echo Check Available Vite Versions
echo ================================
echo.

echo 1. Stopping React container...
docker-compose stop react

echo.
echo 2. Checking available Vite versions...
docker run --rm node:20 npm view vite versions --json | findstr -A 5 -B 5 "5.4"

echo.
echo 3. Checking latest Vite version...
docker run --rm node:20 npm view vite version

echo.
echo 4. Rebuilding with current available versions...
docker-compose build --no-cache react

echo.
echo 5. Starting React container...
docker-compose up -d react

echo.
echo 6. Waiting for startup...
timeout /t 5 /nobreak > nul

echo.
echo 7. Checking final Vite version...
docker-compose logs react --tail=10

echo.
echo ================================
echo Version check completed!
echo ================================
pause
