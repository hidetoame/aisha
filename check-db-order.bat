@echo off
echo Checking category order in database...
docker-compose exec db psql -U dev_user -d dev_db -c "SELECT id, name, order_index FROM api_category ORDER BY order_index, id;"

echo.
echo Current categories with their order_index:
pause
