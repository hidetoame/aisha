@echo off
echo ================================
echo Undo ALL Cursor Changes
echo ================================
echo.

echo 1. Stopping React container...
docker-compose stop react

echo.
echo 2. Removing any JavaScript config files...
if exist "react_project\vite.config.js" del "react_project\vite.config.js"

echo.
echo 3. Clearing cache...
if exist "react_project\node_modules" rmdir /s /q "react_project\node_modules"
if exist "react_project\package-lock.json" del "react_project\package-lock.json"

echo.
echo 4. Clearing Docker cache...
docker builder prune -f

echo.
echo 5. Rebuilding with corrected configuration...
docker-compose build --no-cache react

echo.
echo 6. Starting React container...
docker-compose up -d react

echo.
echo 7. Waiting for startup...
timeout /t 5 /nobreak > nul

echo.
echo 8. Checking final configuration...
docker-compose logs react --tail=20

echo.
echo ================================
echo Configuration restored!
echo ================================
pause
