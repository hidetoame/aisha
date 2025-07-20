@echo off
echo Fixing SUZURI api_config by removing sub_materials...
echo.

echo === Before fixing ===
docker-compose exec db psql -U dev_user -d dev_db -c "SELECT id, display_name, api_config FROM goods_management WHERE is_public = true ORDER BY display_order;"

echo.
echo === Removing sub_materials from api_config ===

REM スタンダードTシャツの修正
docker-compose exec db psql -U dev_user -d dev_db -c "UPDATE goods_management SET api_config = '{\"itemId\": 1, \"resizeMode\": \"cover\", \"exemplaryItemVariantId\": 1, \"published\": true}' WHERE suzuri_item_id = 1;"

REM 刺しゅうフリースジャケットの修正
docker-compose exec db psql -U dev_user -d dev_db -c "UPDATE goods_management SET api_config = '{\"itemId\": 327, \"resizeMode\": \"contain\", \"exemplaryItemVariantId\": 3252, \"published\": true}' WHERE suzuri_item_id = 327;"

REM マスキングテープの修正
docker-compose exec db psql -U dev_user -d dev_db -c "UPDATE goods_management SET api_config = '{\"itemId\": 261, \"resizeMode\": \"cover\", \"exemplaryItemVariantId\": 3149, \"published\": true}' WHERE suzuri_item_id = 261;"

REM フラット缶ケースの修正
docker-compose exec db psql -U dev_user -d dev_db -c "UPDATE goods_management SET api_config = '{\"itemId\": 228, \"resizeMode\": \"cover\", \"exemplaryItemVariantId\": 3080, \"published\": true}' WHERE suzuri_item_id = 228;"

echo.
echo === After fixing ===
docker-compose exec db psql -U dev_user -d dev_db -c "SELECT id, display_name, api_config FROM goods_management WHERE is_public = true ORDER BY display_order;"

echo.
echo Fix completed! Now restart the containers...
docker-compose restart web

echo.
echo All done! You can now test merchandise creation.
pause
