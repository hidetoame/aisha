@echo off
echo ===== Docker Status Check =====
docker ps
echo.
echo ===== Docker Compose Status =====
docker-compose ps
echo.
echo ===== Recent Docker Logs =====
docker-compose logs --tail=20
echo.
echo ===== Network Check =====
curl -s http://localhost:7999/api/ || echo "Backend API not responding"
curl -s http://localhost:5173/ || echo "Frontend not responding"
pause
