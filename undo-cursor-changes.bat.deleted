@echo off
echo ================================
echo Undo Cursor AI Changes
echo ================================
echo.

echo Cursor AI made these changes:
echo - React 19 → React 18 (WRONG!)
echo - Vite 6.3.5 → Vite 5.4.10 (WRONG!)
echo - @vitejs/plugin-react downgraded
echo - ES modules configuration broken
echo.

echo 1. Stopping React container...
docker-compose stop react

echo.
echo 2. Removing Cursor's broken dependencies...
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
echo 4. Restoring to original working configuration...
echo    - React 19.1.0 (ORIGINAL)
echo    - Vite 6.3.5 (ORIGINAL)
echo    - @vitejs/plugin-react 4.3.3 (STABLE)
echo    - ES modules support (ORIGINAL)
docker-compose build --no-cache react

echo.
echo 5. Starting React container...
docker-compose up -d react

echo.
echo 6. Waiting for startup...
timeout /t 5 /nobreak > nul

echo.
echo 7. Checking if original environment is restored...
docker-compose logs react --tail=20

echo.
echo ================================
echo Cursor AI changes undone!
echo ================================
echo.
echo Original working environment restored:
echo - React 19 + Vite 6 (latest, stable)
echo - ES modules working
echo - Import maps functional
echo - All modern features enabled
echo.
echo Check browser at localhost:5173
pause
