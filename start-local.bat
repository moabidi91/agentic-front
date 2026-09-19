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

echo.
where cargo >nul 2>nul
if errorlevel 1 (
  echo [INFO] Rust ^(cargo^) n'est pas detecte : l'application desktop ne peut pas se lancer.
  echo Installez Rust depuis https://rustup.rs/ puis relancez ce script.
  echo Necessaire aussi : Visual Studio Build Tools ^(charge de travail C++^)
  echo et le runtime WebView2 ^(deja present sur la plupart des Windows 10/11 a jour^).
  echo.
  echo Mode navigateur ^(sans build desktop^) : appuyez sur O
  echo Quitter pour installer Rust d'abord : appuyez sur N
  choice /C ON /M "Votre choix"
  if errorlevel 2 exit /b 1
  goto :browser_mode
)
for /f "delims=" %%v in ('cargo --version') do echo Rust detecte : %%v

echo.
echo Lancement de l'application desktop ^(npm run tauri dev^)...
echo Premiere execution : la compilation Rust peut prendre plusieurs minutes.
echo Une fenetre de l'application va s'ouvrir automatiquement une fois prete.
echo.
call npm run tauri dev
echo.
echo L'application desktop s'est fermee.
pause
goto :end

:browser_mode
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
echo L'application tourne dans la fenetre "agentic-front - serveur dev" ^(mode navigateur, sans Rust^).
echo Fermez cette fenetre ^(ou Ctrl+C dedans^) pour arreter le serveur.
echo.
echo Vous pouvez fermer cette fenetre-ci maintenant.
pause

:end
endlocal
