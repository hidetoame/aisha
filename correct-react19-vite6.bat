@echo off
echo ================================
echo Correct React 19 + Vite 6 Setup
echo ================================
echo.

echo 1. Stopping React container...
docker-compose stop react

echo.
echo 2. Removing conflicting dependencies...
if exist "react_project\node_modules" (
    rmdir /s /q "react_project\node_modules"
    echo node_modules removed
)

if exist "react_project\package-lock.json" (
    del "react_project\package-lock.json"
    echo package-lock.json removed
)

echo.
echo 3. Clearing Docker cache...
docker builder prune -f

echo.
echo 4. Building with correct versions...
echo    - React 19.1.0
echo    - Vite 6.3.5
echo    - @types/react 19.1.0
docker-compose build --no-cache react

echo.
echo 5. Starting React container...
docker-compose up -d react

echo.
echo 6. Waiting for startup...
timeout /t 5 /nobreak > nul

echo.
echo 7. Checking if Vite 6 is working...
docker-compose logs react --tail=20

echo.
echo ================================
echo Correct setup completed!
echo ================================
echo.
echo Now using proper combination:
echo - React 19.1.0 (latest)
echo - Vite 6.3.5 (React 19 compatible)
echo - ES modules and import maps
echo.
pause
