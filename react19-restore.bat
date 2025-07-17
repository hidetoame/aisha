@echo off
echo ================================
echo React 19 Restoration
echo ================================
echo.

echo 1. Stopping React container...
docker-compose stop react

echo.
echo 2. Removing old React 18 dependencies...
if exist "react_project\node_modules" (
    rmdir /s /q "react_project\node_modules"
    echo Node modules removed
) else (
    echo No node_modules found
)

if exist "react_project\package-lock.json" (
    del "react_project\package-lock.json"
    echo package-lock.json removed
) else (
    echo No package-lock.json found
)

echo.
echo 3. Clearing Docker build cache...
docker builder prune -f

echo.
echo 4. Building React 19 container...
docker-compose build --no-cache react

echo.
echo 5. Starting React container...
docker-compose up -d react

echo.
echo 6. Checking React 19 logs...
timeout /t 5 /nobreak > nul
docker-compose logs react --tail=20

echo.
echo ================================
echo React 19 restoration completed!
echo ================================
echo.
echo React 19 features:
echo - Import maps for ESM modules
echo - Better performance
echo - Latest React features
echo.
echo Check localhost:5173 in your browser
pause
