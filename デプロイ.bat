@echo off
chcp 65001 > nul
title 小学校アプリ デプロイ
cd /d "%~dp0"

echo.
echo ========================================
echo   GitHub にアップロード中...
echo ========================================
echo.

REM 変更されたファイルをすべてステージング
git add -A

REM 変更がなければスキップ
git diff --cached --quiet
if %errorlevel% == 0 (
  echo 変更がないため、コミットをスキップします。
  goto push
)

REM 現在の日時をコミットメッセージに使う
for /f "usebackq tokens=*" %%a in (`powershell -NoProfile -Command "Get-Date -Format 'yyyy/MM/dd HH:mm'"`) do set TIMESTAMP=%%a
git commit -m "update: %TIMESTAMP%"

:push
REM GitHub に push（GitHub Actions が自動でデプロイ）
git push origin main

echo.
echo ========================================
echo   完了！1〜2分後にスマホで確認してください。
echo.
echo     https://towaruyue0-bit.github.io/shogakko/
echo.
echo ========================================
echo.
pause
