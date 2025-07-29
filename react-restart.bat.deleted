@echo off
echo ================================
echo Restarting React Container Only
echo ================================
echo.

echo Stopping React container...
docker-compose stop react

echo.
echo Building React container...
docker-compose build react

echo.
echo Starting React container...
docker-compose up -d react

echo.
echo Checking React container status...
docker-compose ps react

echo.
echo Waiting for React to start...
timeout /t 5 /nobreak > nul

echo.
echo React container logs:
docker-compose logs react --tail=20

echo.
echo ================================
echo React restart completed!
echo ================================
echo.
echo Check localhost:5173 in your browser
pause
