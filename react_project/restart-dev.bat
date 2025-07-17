@echo off
echo Restarting React development server...
cd /d C:\Users\hidet\Documents\AISHA\react_project

echo Stopping any running processes...
taskkill /f /im node.exe 2>nul

echo Starting development server...
npm run dev

pause
