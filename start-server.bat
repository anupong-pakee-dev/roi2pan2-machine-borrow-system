@echo off
chcp 65001 >nul
title MachineLog Server

:: หา IP ของเครื่อง
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set IP=%%a
    goto :found
)
:found
set IP=%IP:~1%

:: เริ่ม Next.js
echo.
echo  ╔══════════════════════════════════════╗
echo  ║         MachineLog Server            ║
echo  ╠══════════════════════════════════════╣
echo  ║  Local  :  http://localhost:3000     ║
echo  ║  Network:  http://%IP%:3000
echo  ╚══════════════════════════════════════╝
echo.
echo  กำลังเริ่ม server... (ปิดหน้าต่างนี้เพื่อหยุด)
echo.

cd /d "%~dp0"
npm run dev

pause
