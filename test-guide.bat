@echo off
echo ================================
echo AISHA Feature Test Guide
echo ================================
echo.

echo Current Services Status:
echo - React App: http://localhost:5173
echo - Mock API: http://localhost:4000
echo - Django API: http://localhost:7999
echo - Database: localhost:5431
echo.

echo ================================
echo Manual Testing Checklist:
echo ================================
echo.
echo 1. Browser Test:
echo    - Open http://localhost:5173
echo    - Check if page loads without errors
echo    - Open F12 Developer Tools Console
echo    - Look for any red error messages
echo.

echo 2. Layout Test:
echo    - Check if header is visible
echo    - Check if login button is present
echo    - Check if timeline/gallery displays correctly
echo.

echo 3. Login Test:
echo    - Try clicking login button
echo    - Check if modal opens
echo    - Try demo credentials if available
echo.

echo 4. API Test:
echo    - Check browser console for API calls
echo    - No "ERR_CONNECTION_REFUSED" should appear
echo    - Firebase should initialize successfully
echo.

echo 5. Mobile/Responsive Test:
echo    - Try resizing browser window
echo    - Check if layout adapts correctly
echo.

echo ================================
echo Common Issues to Check:
echo ================================
echo.
echo - Layout broken? Check CSS/Tailwind loading
echo - Login not working? Check Firebase config
echo - API errors? Check container logs
echo - Images not loading? Check image paths
echo.

echo ================================
echo Debug Commands:
echo ================================
echo.
echo React logs:    docker-compose logs react
echo Mock logs:     docker-compose logs mock
echo Django logs:   docker-compose logs web
echo Database logs: docker-compose logs db
echo.

echo All containers: docker-compose ps
echo Restart all:    docker-compose restart
echo.

pause
