@echo off
echo ================================
echo CSS/Tailwind Fix
echo ================================
echo.

echo 1. Stopping React container...
docker-compose stop react

echo.
echo 2. Clearing CSS/build cache...
docker builder prune -f

echo.
echo 3. Rebuilding with CSS fixes...
docker-compose build --no-cache react

echo.
echo 4. Starting React container...
docker-compose up -d react

echo.
echo 5. Waiting for startup...
timeout /t 5 /nobreak > nul

echo.
echo 6. Checking if CSS is working...
docker-compose logs react --tail=15

echo.
echo ================================
echo CSS fix completed!
echo ================================
echo.
echo Changes made:
echo - Fixed Tailwind config content paths
echo - Added PostCSS config file
echo - Added CSS processing to Vite config
echo - Added proper keyframes for animations
echo.
echo Now refresh your browser at localhost:5173
echo Check if the layout is fixed!
pause
