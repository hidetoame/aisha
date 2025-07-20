@echo off
echo Testing current api_config in Docker container...
echo.

docker-compose exec web python /app/test_current_api_config.py

echo.
echo Test completed.
pause
