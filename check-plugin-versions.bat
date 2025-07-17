@echo off
echo ================================
echo Check Available Plugin Versions
echo ================================
echo.

echo 1. Checking @vitejs/plugin-react versions...
docker run --rm node:20 npm view @vitejs/plugin-react versions --json | findstr -A 10 -B 10 "4.3"

echo.
echo 2. Checking latest version...
docker run --rm node:20 npm view @vitejs/plugin-react version

echo.
echo 3. Checking versions compatible with Vite 6...
docker run --rm node:20 npm view @vitejs/plugin-react@latest

echo.
pause
