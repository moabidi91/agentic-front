@echo off
setlocal EnableExtensions
title Agentic Front - lancement local
cd /d "%~dp0"

echo Dossier du projet : %cd%
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERREUR] Node.js n'est pas installe ou pas dans le PATH.
  echo Installez Node.js depuis https://nodejs.org/ puis relancez ce script.
  pause
  exit /b 1
)

for /f "delims=" %%v in ('node -v') do echo Node.js detecte : %%v

if not exist "node_modules" (
  echo.
  echo Installation des dependances npm, premiere execution uniquement...
  echo ^(peut prendre 1 a 2 minutes^)
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERREUR] npm install a echoue. Voir le message ci-dessus.
    pause
    exit /b 1
  )
  echo Dependances installees.
)

set PORT=5183
set URL=http://localhost:%PORT%/

echo.
echo Demarrage du serveur de developpement sur %URL% ...
start "agentic-front - serveur dev" cmd /k "npm run dev -- --port %PORT%"

echo Attente que le serveur soit pret...
powershell -NoProfile -Command ^
  "$ok=$false; for ($i=0; $i -lt 40; $i++) { try { Invoke-WebRequest -Uri '%URL%' -UseBasicParsing -TimeoutSec 1 | Out-Null; $ok=$true; break } catch { Start-Sleep -Milliseconds 500 } }; if (-not $ok) { exit 1 }"

if errorlevel 1 (
  echo Le serveur met du temps a demarrer. Regardez la fenetre "agentic-front - serveur dev" pour voir si une erreur s'est affichee.
) else (
  echo Serveur pret.
  start "" "%URL%"
)

echo.
echo L'application tourne dans la fenetre "agentic-front - serveur dev".
echo Fermez cette fenetre ^(ou Ctrl+C dedans^) pour arreter le serveur.
echo.
echo Vous pouvez fermer cette fenetre-ci maintenant.
pause
endlocal
