@echo off
echo Installing dnd-kit packages in Docker container...
docker-compose exec react npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

echo.
echo Restarting React container...
docker-compose restart react

echo.
echo Checking if packages are installed...
docker-compose exec react npm list @dnd-kit/core

echo.
echo Done! Check the browser at http://localhost:5173
pause
