@echo off
echo ================================
echo ES Module CSS Fix
echo ================================
echo.

echo 1. Stopping React container...
docker-compose stop react

echo.
echo 2. Clearing cache...
docker builder prune -f

echo.
echo 3. Rebuilding with ES module configs...
docker-compose build --no-cache react

echo.
echo 4. Starting React container...
docker-compose up -d react

echo.
echo 5. Waiting for startup...
timeout /t 5 /nobreak > nul

echo.
echo 6. Checking logs...
docker-compose logs react --tail=20

echo.
echo ================================
echo ES Module fix completed!
echo ================================
echo.
echo Changes made:
echo - PostCSS config: module.exports → export default
echo - Tailwind config: module.exports → export default
echo - Both configs now ES module compatible
echo.
echo Check browser at localhost:5173
pause
