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
statut=0
maestro test \
  -e COLIS_MARIE="$COLIS_MARIE" -e COLIS_JEAN="$COLIS_JEAN" \
  --format junit --output "$sortie/maestro-$plateforme.xml" \
  --debug-output "$sortie/debogage" \
  "$racine/essais/maestro/" || statut=$?

if [ "$statut" -ne 0 ]; then
  # Les captures restent dans les artefacts ; le journal de la CI dit déjà l'essentiel :
  # ce que Maestro voit à l'écran au moment de l'échec, et ce qu'a dit l'application.
  echo "== Écran au moment de l'échec (textes et identifiants vus par Maestro)"
  maestro hierarchy > "$sortie/ecran-echec.json" 2>/dev/null || true
  python3 - "$sortie/ecran-echec.json" <<'PY' || true
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
  echo "== Messages de l'application"
  if [ "$plateforme" = android ]; then
    adb logcat -d -s ReactNativeJS:V ReactNative:W AndroidRuntime:E | tail -80 || true
  else
    xcrun simctl spawn booted log show --last 5m --style compact \
      --predicate 'process == "GoShipExpress"' 2>/dev/null | grep -iE "error|warn|exception|javascript|\[JS\]" | tail -80 || true
  fi
  exit "$statut"
fi
