@echo off
echo ================================
echo Docker AISHA Troubleshooting
echo ================================
echo.

echo Current directory:
cd
echo.

echo Docker containers status:
docker-compose ps
echo.

echo React container logs:
docker-compose logs react
echo.

echo Web container logs:
docker-compose logs web
echo.

echo Database container logs:
docker-compose logs db
echo.

echo Port usage check:
netstat -an | findstr :5173
netstat -an | findstr :7999
echo.

echo Docker system info:
docker system df
echo.

echo ================================
echo Troubleshooting completed!
echo ================================
pause
