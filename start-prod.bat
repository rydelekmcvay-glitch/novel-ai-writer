@echo off
chcp 65001 > nul
echo ==========================================
echo   Novel AI Writer - 生产模式启动
echo ==========================================

cd backend
set NODE_ENV=production
node dist/index.js
