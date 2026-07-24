@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================================
echo    PUBLIER LE SITE  (push vers GitHub - branche main)
echo ============================================================
echo.

REM --- Verifier que l'on est bien dans le depot git ---
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [ERREUR] Ce dossier n'est pas un depot git.
  echo Garde ce fichier a la racine du depot, puis relance.
  echo.
  pause
  exit /b 1
)

REM --- Montrer ce qui va etre publie ---
echo Modifications en attente :
echo ------------------------------------------------------------
git status -s
echo ------------------------------------------------------------
echo.

REM --- Demander la description de la modification ---
set "msg="
set /p "msg=Decris la modification (message du commit) : "

if not defined msg (
  echo.
  echo [ANNULE] Aucune description saisie. Rien n'a ete publie.
  echo.
  pause
  exit /b 0
)

REM --- Confirmation avant de pousser ---
echo.
echo Message : "%msg%"
set "confirm="
set /p "confirm=Confirmer la publication vers GitHub ? [O/N] : "
if /i not "%confirm%"=="O" (
  echo.
  echo [ANNULE] Rien n'a ete publie.
  echo.
  pause
  exit /b 0
)

REM --- Etapes git ---
echo.
echo [1/3] Preparation des fichiers (git add)...
git add -A

echo [2/3] Enregistrement (git commit)...
git commit -m "%msg%"
if errorlevel 1 (
  echo.
  echo [INFO] Rien a publier ^(aucune modification^) ou commit refuse. Arret.
  echo.
  pause
  exit /b 1
)

echo [3/3] Publication (git push origin main)...
git push origin main
if errorlevel 1 (
  echo.
  echo [ERREUR] La publication a echoue.
  echo Verifie ta connexion Internet ou tes identifiants GitHub.
  echo.
  pause
  exit /b 1
)

echo.
echo ============================================================
echo    TERMINE ! GitHub Actions reconstruit et republie le site.
echo    Suivi : onglet "Actions" du depot sur github.com
echo ============================================================
echo.
pause
