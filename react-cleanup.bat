@echo off
echo ================================
echo React Dependencies Cleanup
echo ================================
echo.

echo 1. Stopping React container...
docker-compose stop react

echo.
echo 2. Removing React node_modules...
if exist "react_project\node_modules" (
    rmdir /s /q "react_project\node_modules"
    echo React node_modules removed
) else (
    echo No React node_modules found
)

echo.
echo 3. Removing package-lock.json...
if exist "react_project\package-lock.json" (
    del "react_project\package-lock.json"
    echo package-lock.json removed
) else (
    echo No package-lock.json found
)

echo.
echo 4. Clearing Docker build cache...
docker builder prune -f

echo.
echo 5. Building React container from scratch...
docker-compose build --no-cache react

echo.
echo 6. Starting React container...
docker-compose up -d react

echo.
echo 7. Checking React logs...
timeout /t 5 /nobreak > nul
docker-compose logs react --tail=20

echo.
echo ================================
echo React cleanup completed!
echo ================================
echo.
echo Check localhost:5173 in your browser
pause
