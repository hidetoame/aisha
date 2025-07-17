@echo off
echo ================================
echo React Container Detail Log Check
echo ================================
echo.

echo Getting React container logs...
docker-compose logs react --tail=50

echo.
echo ================================
echo Getting React container real-time logs...
echo Press Ctrl+C to stop
echo ================================
docker-compose logs -f react
