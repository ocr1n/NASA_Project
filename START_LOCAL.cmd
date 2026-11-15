@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Installing the locked project dependencies...
  call npm ci
  if errorlevel 1 exit /b 1
)
call npm run dev -- --port 5173
