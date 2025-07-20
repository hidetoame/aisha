@echo off
echo Checking SUZURI goods management configuration...
echo.
echo === Current api_config settings ===
docker-compose exec db psql -U dev_user -d dev_db -c "SELECT id, suzuri_item_id, item_name, display_name, api_config, is_public FROM goods_management WHERE is_public = true ORDER BY display_order;"

echo.
echo === Raw api_config JSON ===
docker-compose exec db psql -U dev_user -d dev_db -c "SELECT id, display_name, api_config FROM goods_management WHERE is_public = true AND api_config IS NOT NULL AND api_config != '{}' ORDER BY display_order;"

echo.
pause
