@echo off
echo ================================
echo Force Vite 6 Installation
echo ================================
echo.

echo 1. Stopping React container...
docker-compose stop react

echo.
echo 2. Removing package-lock.json...
if exist "react_project\package-lock.json" (
    del "react_project\package-lock.json"
    echo package-lock.json removed
) else (
    echo No package-lock.json found
)

echo.
echo 3. Removing node_modules...
if exist "react_project\node_modules" (
    rmdir /s /q "react_project\node_modules"
    echo node_modules removed
) else (
    echo No node_modules found
)

echo.
echo 4. Clearing Docker build cache...
docker builder prune -f

echo.
echo 5. Building React container with Vite 6...
docker-compose build --no-cache react

echo.
echo 6. Starting React container...
docker-compose up -d react

echo.
echo 7. Waiting for startup...
timeout /t 5 /nobreak > nul

echo.
echo 8. Checking new Vite version...
docker-compose exec react npx vite --version

echo.
echo 9. React container logs:
docker-compose logs react --tail=15

echo.
echo ================================
echo Vite 6 installation completed!
echo ================================
echo.
echo Look for "VITE v6.x.x" in the logs above
pause
