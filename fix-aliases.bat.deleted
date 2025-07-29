@echo off
echo ================================
echo Fix Cursor Alias Changes
echo ================================
echo.

echo 1. Stopping React container...
docker-compose stop react

echo.
echo 2. Clearing cache...
if exist "react_project\node_modules" rmdir /s /q "react_project\node_modules"
if exist "react_project\package-lock.json" del "react_project\package-lock.json"

echo.
echo 3. Clearing Docker cache...
docker builder prune -f

echo.
echo 4. Rebuilding with alias fixes...
docker-compose build --no-cache react

echo.
echo 5. Starting React container...
docker-compose up -d react

echo.
echo 6. Waiting for startup...
timeout /t 5 /nobreak > nul

echo.
echo 7. Checking if aliases work...
docker-compose logs react --tail=15

echo.
echo ================================
echo Alias restoration completed!
echo ================================
echo.
echo Changes made:
echo - index.tsx: ./src/App -^> @/App
echo - index.tsx: ./src/contexts -^> @/contexts
echo - vite.config.ts: @ alias preserved
echo.
pause
