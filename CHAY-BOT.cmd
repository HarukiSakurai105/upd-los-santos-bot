@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title UPD Los Santos Discord Bot

echo ==================================================
echo          UPD LOS SANTOS DISCORD BOT
echo ==================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [LOI] Chua cai Node.js 20 tro len.
  echo Tai Node.js tai: https://nodejs.org/
  echo Sau khi cai xong, hay dong CMD va chay lai file nay.
  echo.
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [LOI] Khong tim thay npm. Hay cai lai Node.js ban LTS.
  echo.
  pause
  exit /b 1
)

if not exist ".env" (
  echo [CAN CAU HINH] Chua co file .env.
  copy /y ".env.example" ".env" >nul
  echo Da tao .env tu file mau. Hay dien DISCORD_TOKEN, CLIENT_ID va GUILD_ID.
  echo Notepad se duoc mo de ban dien thong tin.
  start "" notepad ".env"
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\discord.js\package.json" (
  echo [CAI DAT] Dang cai thu vien, vui long cho...
  call npm install
  if errorlevel 1 (
    echo.
    echo [LOI] Cai thu vien that bai. Kiem tra Internet roi chay lai.
    pause
    exit /b 1
  )
)

echo [KHOI DONG] Dang mo bot...
echo Khong dong cua so nay khi muon bot tiep tuc online.
echo Nhan Ctrl+C de dung bot.
echo.

call npm start
set "BOT_EXIT_CODE=%ERRORLEVEL%"

echo.
if "%BOT_EXIT_CODE%"=="0" (
  echo Bot da dung.
) else (
  echo [LOI] Bot da dung voi ma loi %BOT_EXIT_CODE%.
  echo Hay xem noi dung loi phia tren.
)
echo.
pause
exit /b %BOT_EXIT_CODE%
