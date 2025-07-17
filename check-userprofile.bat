@echo off
echo Checking api_userprofile table...

echo.
echo === api_userprofile table structure ===
docker-compose exec db psql -U dev_user -d dev_db -c "\d api_userprofile"

echo.
echo === All records in api_userprofile ===
docker-compose exec db psql -U dev_user -d dev_db -c "SELECT * FROM api_userprofile;"

echo.
echo === Looking for user_id 200120 in api_userprofile ===
docker-compose exec db psql -U dev_user -d dev_db -c "SELECT * FROM api_userprofile WHERE user_id = '200120';"

echo.
echo === Looking for nickname 'Ame♪' in api_userprofile ===
docker-compose exec db psql -U dev_user -d dev_db -c "SELECT * FROM api_userprofile WHERE nickname LIKE '%%Ame%%';"

pause
