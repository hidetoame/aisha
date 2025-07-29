@echo off
echo Cleaning up Docker containers and images...
cd /d C:\Users\hidet\Documents\AISHA

echo Stopping all containers...
docker-compose down

echo Removing dangling images...
docker image prune -f

echo Removing volumes (optional - this will clear any database data)...
docker volume prune -f

echo Rebuilding and starting containers...
docker-compose up --build

pause
