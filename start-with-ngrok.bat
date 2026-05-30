@echo off
chcp 65001 > nul
echo ==========================================
echo   Novel AI Writer - 外网访问模式
echo ==========================================
echo.

REM 启动生产服务器（后台）
echo [1/2] 启动服务器...
cd backend
start "Novel AI Writer Server" cmd /k "set NODE_ENV=production && node dist/index.js"
cd ..

timeout /t 3 /nobreak > nul

REM 启动 ngrok 隧道
echo [2/2] 创建外网隧道...
echo.
echo ⚠  首次使用需要：
echo    1. 访问 https://ngrok.com 注册免费账号
echo    2. 在 https://dashboard.ngrok.com/get-started/your-authtoken 复制 Token
echo    3. 运行命令：ngrok config add-authtoken YOUR_TOKEN
echo.
echo 启动中，稍候将显示外网访问地址...
echo （Ctrl+C 可停止隧道，但服务器继续运行）
echo.

npx ngrok http 3001
