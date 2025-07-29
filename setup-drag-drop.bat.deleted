@echo off
echo Installing dnd-kit packages...
cd /d "C:\Users\hidet\Documents\AISHA\react_project"
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

echo.
echo Running Django migration...
cd /d "C:\Users\hidet\Documents\AISHA\pycharm_project"
python manage.py makemigrations
python manage.py migrate

echo.
echo Done! Starting Docker containers...
cd /d "C:\Users\hidet\Documents\AISHA"
docker-compose up -d

echo.
echo Checking status...
timeout /t 5 /nobreak > nul
docker-compose ps
