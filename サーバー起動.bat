@echo off
chcp 65001 > nul
title 小学校 学習アプリ サーバー
cd /d "%~dp0"
echo.
echo ========================================
echo  📚 小学校 学習アプリ を起動しています
echo ========================================
echo.
python server.py
if %errorlevel% neq 0 (
    echo.
    echo ⚠️  Python が見つかりませんでした。
    echo    Python をインストールしてから再度お試しください。
    echo    https://www.python.org/downloads/
    echo.
    pause
)
