@echo off
echo Stopping and removing containers...
docker-compose down

echo Removing unused Docker images...
docker image prune -f

echo Building and starting containers...
docker-compose up --build -d

echo Waiting for services to start...
timeout /t 10 /nobreak > nul

echo Checking container status...
docker-compose ps

echo Done! Services should be running at:
echo - React Frontend: http://localhost:5173
echo - Django Backend: http://localhost:7999
echo - Mock Server: http://localhost:4000
echo - Database: localhost:5431

pause
