@echo off
echo Checking user tables for user_id: 200120...

echo.
echo === PhoneUser table ===
docker-compose exec db psql -U dev_user -d dev_db -c "SELECT id, nickname, phone_number, firebase_uid FROM api_phoneuser WHERE id = '200120' OR firebase_uid = '200120';"

echo.
echo === UserProfile table ===
docker-compose exec db psql -U dev_user -d dev_db -c "SELECT user_id, nickname, phone_number FROM api_userprofile WHERE user_id = '200120';"

echo.
echo === All PhoneUser records ===
docker-compose exec db psql -U dev_user -d dev_db -c "SELECT id, nickname, phone_number, firebase_uid FROM api_phoneuser;"

echo.
echo === All UserProfile records ===
docker-compose exec db psql -U dev_user -d dev_db -c "SELECT user_id, nickname, phone_number FROM api_userprofile;"

echo.
echo === Check if 200120 is in any other user-related tables ===
docker-compose exec db psql -U dev_user -d dev_db -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%%user%%';"

pause
