@echo off
echo ================================
echo Final CSS Fix (.cjs approach)
echo ================================
echo.

echo 1. Stopping React container...
docker-compose stop react

echo.
echo 2. Removing old .js config files...
if exist "react_project\postcss.config.js" del "react_project\postcss.config.js"
if exist "react_project\tailwind.config.js" del "react_project\tailwind.config.js"

echo.
echo 3. Clearing cache...
docker builder prune -f

echo.
echo 4. Rebuilding with .cjs configs...
docker-compose build --no-cache react

echo.
echo 5. Starting React container...
docker-compose up -d react

echo.
echo 6. Waiting for startup...
timeout /t 5 /nobreak > nul

echo.
echo 7. Checking logs...
docker-compose logs react --tail=20

echo.
echo ================================
echo Final fix completed!
echo ================================
echo.
echo Now using .cjs files for compatibility:
echo - postcss.config.cjs
echo - tailwind.config.cjs
echo.
echo Check browser at localhost:5173
pause
