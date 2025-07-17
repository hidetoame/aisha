@echo off
echo ================================
echo Vite Version Check
echo ================================
echo.

echo 1. Current package.json Vite version:
findstr "vite" "react_project\package.json"

echo.
echo 2. Current React container Vite version:
docker-compose exec react npx vite --version

echo.
echo 3. Package-lock.json Vite version:
findstr -A 5 -B 5 "\"vite\"" "react_project\package-lock.json" | head -10

echo.
echo 4. Node modules Vite version:
docker-compose exec react ls -la node_modules/.bin/vite

echo.
pause
