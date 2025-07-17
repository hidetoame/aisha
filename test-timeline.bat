@echo off
echo ================================
echo Testing Public Timeline API
echo ================================
echo.

echo Testing public-timeline endpoint:
curl -s http://localhost:4000/api/public-timeline

echo.
echo.
echo ================================
echo Manual Test Instructions:
echo ================================
echo.
echo 1. Go to http://localhost:5173
echo 2. Refresh the page (F5 or Ctrl+R)
echo 3. Check if layout is now correct
echo 4. Look for timeline images
echo 5. Check browser console (F12) for errors
echo.
pause
