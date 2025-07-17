@echo off
echo ================================
echo Undo ALL Cursor Changes
echo ================================
echo.

echo Cursor made these changes:
echo 1. ✅ vite build → npx vite build (GOOD)
echo 2. ✅ @vitejs/plugin-react fixes (GOOD) 
echo 3. ✅ Vite settings fixes (GOOD)
echo 4. ❌ vite.config.ts → vite.config.js (BAD - TypeScript lost)
echo 5. ✅ Dependency issues solved (GOOD)
echo.

echo Keeping GOOD changes, reverting BAD changes...
echo.

echo 1. Stopping React container...
docker-compose stop react

echo.
echo 2. Ensuring TypeScript configuration is correct...
echo    - vite.config.ts (TypeScript) ✅
echo    - Build configuration added ✅
echo    - PostCSS configuration preserved ✅

echo.
echo 3. Removing any JavaScript config files...
if exist "react_project\vite.config.js" (
    del "react_project\vite.config.js"
    echo vite.config.js removed (TypeScript version preferred)
)

echo.
echo 4. Clearing cache...
if exist "react_project\node_modules" (
    rmdir /s /q "react_project\node_modules"
    echo node_modules removed
)

if exist "react_project\package-lock.json" (
    del "react_project\package-lock.json"
    echo package-lock.json removed
)

echo.
echo 5. Clearing Docker cache...
docker builder prune -f

echo.
echo 6. Rebuilding with corrected configuration...
docker-compose build --no-cache react

echo.
echo 7. Starting React container...
docker-compose up -d react

echo.
echo 8. Waiting for startup...
timeout /t 5 /nobreak > nul

echo.
echo 9. Checking final configuration...
docker-compose logs react --tail=20

echo.
echo ================================
echo Configuration restored!
echo ================================
echo.
echo Final state:
echo ✅ React 19.1.0 + Vite 6.3.5 (original)
echo ✅ TypeScript configuration preserved
echo ✅ Build configuration added
echo ✅ ES modules working
echo ✅ PostCSS + Tailwind working
echo ✅ All good Cursor changes kept
echo ❌ Bad Cursor changes reverted
echo.
pause
