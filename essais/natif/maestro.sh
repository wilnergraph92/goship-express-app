#!/bin/bash
# Lance les parcours Maestro (essais/maestro/) sur l'émulateur ou le simulateur démarré,
# contre la base d'essai (essai-mobile.py --serveur, sur le port 54321 de la machine).
#   bash essais/natif/maestro.sh <android|ios> <dossier de sortie>
set -euo pipefail
plateforme="$1"
racine="$(pwd)"
sortie="$(mkdir -p "$2" && cd "$2" && pwd)"

sql() {
  curl -sS -X POST http://localhost:54321/essai/sql -d "{\"requete\":\"$1\"}" \
    | python3 -c "import json,sys; print(json.load(sys.stdin)['sortie'].strip().splitlines()[-1])"
}
COLIS_MARIE=$(sql "select id from colis where numero = 'GSE-1002-HT';")
COLIS_JEAN=$(sql "select id from colis where numero = 'GSE-1026-HT';")
echo "Colis d'essai : Marie $COLIS_MARIE, Jean $COLIS_JEAN"

cd "$sortie"
# Un parcours par lancement de Maestro : si son pilote (XCTest sur iOS) s'arrête en route,
# le parcours suivant ne part pas d'un appareil injoignable.
# Un parcours n'est relancé qu'une fois, et seulement quand c'est le pilote qui a lâché
# (« Device became unreachable », « driver not ready ») : une assertion ratée ne se
# rejoue jamais, elle fait échouer l'essai.
lancer() {
  maestro test \
    -e COLIS_MARIE="$COLIS_MARIE" -e COLIS_JEAN="$COLIS_JEAN" \
    --format junit --output "$sortie/maestro-$plateforme-$2.xml" \
    --debug-output "$sortie/debogage/$2" \
    "$1"
}
pilote_perdu() {
  grep -qE "DeviceUnreachableException|driver not ready|Device became unreachable" "$sortie/maestro-$plateforme-$1.xml" 2>/dev/null
}
# Ce que Maestro voyait et ce qu'a dit l'application, relevé juste après le parcours
# qui a échoué (le parcours suivant changerait l'écran)
diagnostiquer() {
  nom="$1"
  # Les captures restent dans les artefacts ; le journal de la CI dit déjà l'essentiel :
  # ce que Maestro voit à l'écran au moment de l'échec, et ce qu'a dit l'application.
  # Capture de l'écran tel quel (artefact « …-echec.png »)
  if [ "$plateforme" = android ]; then
    adb exec-out screencap -p > "$sortie/ecran-echec-$nom.png" || true
  else
    xcrun simctl io booted screenshot "$sortie/ecran-echec-$nom.png" || true
  fi
  # L'étape qui a échoué, telle que Maestro la rapporte (le résumé de la console ne donne
  # que le nom du parcours)
  echo "== Étape en échec"
  python3 - "$sortie/maestro-$plateforme-$nom.xml" <<'PY' || true
import sys, xml.etree.ElementTree as ET
for chemin in sys.argv[1:]:
    if chemin.endswith('-pilote-perdu.xml'):
        continue
    try:
        racine = ET.parse(chemin).getroot()
    except Exception as e:
        print('rapport illisible (%s) : %s' % (chemin, e))
        continue
    for cas in racine.iter('testcase'):
        for echec in list(cas.iter('failure')) + list(cas.iter('error')):
            print('%s : %s' % (cas.get('name'), (echec.get('message') or echec.text or '').strip()[:600]))
PY
  echo "== Écran au moment de l'échec (textes et identifiants vus par Maestro)"
  maestro hierarchy > "$sortie/ecran-echec-$nom.json" 2>/dev/null || true
  python3 - "$sortie/ecran-echec-$nom.json" <<'PY' || true
import json, sys
try:
    racine = json.load(open(sys.argv[1]))
except Exception as e:
    sys.exit('hiérarchie illisible : %s' % e)
def parcourir(n, prof=0):
    a = n.get('attributes') or {}
    bouts = [a.get(k) for k in ('resource-id', 'text', 'accessibilityText', 'hintText') if a.get(k)]
    if bouts:
        print('  ' * min(prof, 12) + ' | '.join(bouts))
    for e in n.get('children') or []:
        parcourir(e, prof + 1)
parcourir(racine)
PY
  if [ -n "${BASE_LOG:-}" ] && [ -f "$BASE_LOG" ]; then
    echo "== Requêtes refusées par la base d'essai"
    grep '^REST' "$BASE_LOG" | tail -40 || echo "(aucune)"
  fi
  echo "== Messages de l'application"
  if [ "$plateforme" = android ]; then
    adb logcat -d -s ReactNativeJS:V ReactNative:W AndroidRuntime:E | tail -80 || true
  else
    xcrun simctl spawn booted log show --last 5m --style compact \
      --predicate 'process == "GoShipExpress"' 2>/dev/null | grep -iE "error|warn|exception|javascript|\[JS\]" | tail -80 || true
  fi
}

statut=0
for parcours in "$racine"/essais/maestro/*.yaml; do
  nom="$(basename "$parcours" .yaml)"
  s=0; lancer "$parcours" "$nom" || s=$?
  if [ "$s" -ne 0 ] && pilote_perdu "$nom"; then
    echo "== $nom : le pilote de Maestro a lâché (pas une assertion) — nouvel essai, le seul"
    mv "$sortie/maestro-$plateforme-$nom.xml" "$sortie/maestro-$plateforme-$nom-pilote-perdu.xml"
    s=0; lancer "$parcours" "$nom" || s=$?
  fi
  if [ "$s" -ne 0 ]; then statut=$s; diagnostiquer "$nom"; fi
done

exit "$statut"
