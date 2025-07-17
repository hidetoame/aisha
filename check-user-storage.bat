@echo off
echo Checking if user names are stored in database...

echo.
echo === Check all user-related tables ===
docker-compose exec db psql -U dev_user -d dev_db -c "\dt" | findstr user

echo.
echo === UserProfile table (if exists) ===
docker-compose exec db psql -U dev_user -d dev_db -c "SELECT * FROM api_userprofile WHERE user_id = '200120';" 2>nul || echo "api_userprofile table does not exist"

echo.
echo === PhoneUser table (if exists) ===
docker-compose exec db psql -U dev_user -d dev_db -c "SELECT * FROM api_phoneuser WHERE id = '200120';" 2>nul || echo "api_phoneuser table does not exist"

echo.
echo === UserCredit table ===
docker-compose exec db psql -U dev_user -d dev_db -c "SELECT * FROM api_usercredit WHERE user_id = '200120';"

echo.
echo === Check if there's a separate user info table ===
docker-compose exec db psql -U dev_user -d dev_db -c "\d" | findstr -i "user\|profile\|auth"

pause
