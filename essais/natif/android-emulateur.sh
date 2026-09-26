#!/bin/bash
# Dans l'émulateur Android démarré (android-emulator-runner) :
#   1. l'application d'ESSAI (base d'essai, http://10.0.2.2:54321) : parcours Maestro ;
#   2. l'application de PRODUCTION (celle des boutiques) : installation, lancement,
#      écran de connexion, aucun plantage — sans se connecter (jamais la vraie base).
#   bash essais/natif/android-emulateur.sh <apk d'essai> <apk de production> <dossier de sortie>
set -euo pipefail
essai="$1"; production="$2"; sortie="$3"
mkdir -p "$sortie"
adb logcat -c || true
# Émulateur logiciel, donc lent : Android affiche parfois « … isn't responding » par-dessus
# l'application (le lanceur, pas GoShip). On masque ces fenêtres et on laisse le système
# finir de démarrer ; un plantage de l'application reste visible dans le journal (FATAL).
adb shell settings put global hide_error_dialogs 1 || true
adb shell am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS > /dev/null 2>&1 || true
sleep 20

echo "== Application d'essai"
adb install -r "$essai"
bash essais/natif/maestro.sh android "$sortie" || { adb logcat -d > "$sortie/logcat-essai.txt"; exit 1; }
adb logcat -d > "$sortie/logcat-essai.txt"
if grep -q "FATAL EXCEPTION" "$sortie/logcat-essai.txt"; then echo "Plantage pendant les parcours"; exit 1; fi

echo "== Application de production"
adb uninstall com.goshipexpress.app || true
adb install "$production"
adb logcat -c || true
debut=$(date +%s%N)
adb shell monkey -p com.goshipexpress.app -c android.intent.category.LAUNCHER 1
# L'écran de connexion est affiché quand le texte du bouton est à l'écran
for i in $(seq 1 60); do
  adb shell uiautomator dump /sdcard/ecran.xml > /dev/null 2>&1 || true
  if adb shell cat /sdcard/ecran.xml 2>/dev/null | grep -qE "Sign in|Se connecter"; then break; fi
  sleep 1
done
fin=$(date +%s%N)
adb shell cat /sdcard/ecran.xml > "$sortie/production-ecran.xml"
adb exec-out screencap -p > "$sortie/production-lancement.png"
adb logcat -d > "$sortie/logcat-production.txt"
grep -qE "Sign in|Se connecter" "$sortie/production-ecran.xml" || { echo "Écran de connexion absent"; exit 1; }
if grep -q "FATAL EXCEPTION" "$sortie/logcat-production.txt"; then echo "Plantage au lancement"; exit 1; fi
pid=$(adb shell pidof com.goshipexpress.app || true)
[ -n "$pid" ] || { echo "L'application ne tourne plus"; exit 1; }
echo "Production : lancée, écran de connexion en $(( (fin - debut) / 1000000 )) ms (émulateur), aucun plantage."
