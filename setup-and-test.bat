@echo off
echo Installing dnd-kit packages...
cd /d "C:\Users\hidet\Documents\AISHA\react_project"
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

echo.
echo Running Django migrations...
cd /d "C:\Users\hidet\Documents\AISHA\pycharm_project"
python manage.py migrate

echo.
echo Starting Docker containers...
cd /d "C:\Users\hidet\Documents\AISHA"
docker-compose up -d

echo.
echo Setup complete! Check the browser at http://localhost:5173
echo Go to admin panel and try the drag and drop functionality for categories
pause
