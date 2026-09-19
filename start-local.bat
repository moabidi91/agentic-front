@echo off
setlocal EnableExtensions
title Agentic Front - lancement local
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERREUR] Node.js n'est pas installe ou pas dans le PATH.
  echo Installez Node.js (https://nodejs.org/) puis relancez ce script.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installation des dependances npm, premiere execution uniquement...
  call npm install
  if errorlevel 1 (
    echo [ERREUR] npm install a echoue.
    pause
    exit /b 1
  )
)

set PORT=5183
set URL=http://localhost:%PORT%/

echo Demarrage du serveur de developpement sur %URL% ...
start "agentic-front - serveur dev" cmd /k "npm run dev -- --port %PORT%"

echo Attente que le serveur soit pret...
powershell -NoProfile -Command ^
  "$ok=$false; for ($i=0; $i -lt 40; $i++) { try { Invoke-WebRequest -Uri '%URL%' -UseBasicParsing -TimeoutSec 1 | Out-Null; $ok=$true; break } catch { Start-Sleep -Milliseconds 500 } }; if (-not $ok) { exit 1 }"

if errorlevel 1 (
  echo Le serveur met du temps a demarrer, ouverture du navigateur quand meme...
) else (
  echo Serveur pret.
)

start "" "%URL%"

echo.
echo L'application tourne dans la fenetre "agentic-front - serveur dev".
echo Fermez cette fenetre (ou Ctrl+C dedans) pour arreter le serveur.
endlocal
