@echo off
chcp 65001 > nul
echo ==========================================
echo   Novel AI Writer - 生产构建
echo ==========================================
echo.

echo [1/4] 构建前端...
cd frontend
call npm run build
if errorlevel 1 ( echo 前端构建失败！ & pause & exit /b 1 )
cd ..

echo [2/4] 复制前端到后端 public 目录...
if exist backend\public rmdir /S /Q backend\public
mkdir backend\public
xcopy /E /Y /I frontend\dist backend\public > nul
echo     已复制到 backend/public/

echo [3/4] 编译后端 TypeScript...
cd backend
call npx tsc
if errorlevel 1 ( echo 后端编译失败！ & pause & exit /b 1 )
cd ..

echo [4/4] 生成 Prisma Client...
cd backend
call npx prisma generate
call npx prisma db push
cd ..

echo.
echo ==========================================
echo   构建完成！
echo   运行 start-prod.bat 启动生产服务器
echo ==========================================
pause
