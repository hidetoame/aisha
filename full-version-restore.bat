@echo off
echo ================================
echo Full Version Restoration
echo React 19 + Vite 6.3.5
echo ================================
echo.

echo 1. Stopping React container...
docker-compose stop react

echo.
echo 2. Removing old dependencies...
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
echo 4. Building with latest versions...
echo    - React 19.1.0
echo    - Vite 6.3.5
echo    - @vitejs/plugin-react 5.0.0
docker-compose build --no-cache react

echo.
echo 5. Starting React container...
docker-compose up -d react

echo.
echo 6. Checking logs...
timeout /t 5 /nobreak > nul
docker-compose logs react --tail=30

echo.
echo ================================
echo Full restoration completed!
echo ================================
echo.
echo Restored to original working versions:
echo - React: 19.1.0 (latest)
echo - Vite: 6.3.5 (latest)
echo - ESM import maps enabled
echo - Latest TypeScript types
echo.
echo Check localhost:5173 in your browser
pause
