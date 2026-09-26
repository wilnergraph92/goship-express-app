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
maestro test \
  -e COLIS_MARIE="$COLIS_MARIE" -e COLIS_JEAN="$COLIS_JEAN" \
  --format junit --output "$sortie/maestro-$plateforme.xml" \
  --debug-output "$sortie/debogage" \
  "$racine/essais/maestro/"
