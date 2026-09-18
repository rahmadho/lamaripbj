@echo off
REM Backup harian aplikasi arsip (versi Windows). Panggil lewat Task Scheduler.
REM Menjalankan scripts/backup.sh memakai Git Bash bila tersedia.

setlocal

set AKAR=%~dp0..
if "%DATABASE_URL%"=="" set DATABASE_URL=postgresql://postgres@localhost:5432/arsip
if "%STORAGE_DIR%"=="" set STORAGE_DIR=%AKAR%\storage
if "%BACKUP_DIR%"=="" set BACKUP_DIR=%AKAR%\backups

set BASH=
where bash >nul 2>nul && set BASH=bash
if "%BASH%"=="" if exist "C:\Program Files\Git\bin\bash.exe" set BASH="C:\Program Files\Git\bin\bash.exe"

if "%BASH%"=="" (
  echo ERROR: bash tidak ditemukan. Pasang Git for Windows atau jalankan backup.sh manual.
  exit /b 1
)

echo Menjalankan backup...
%BASH% "%AKAR%\scripts\backup.sh"
if errorlevel 1 (
  echo Backup GAGAL.
  exit /b 1
)

echo Backup selesai.
endlocal
