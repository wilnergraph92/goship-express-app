#!/bin/bash
# Récupère le dépôt du site (migrations, base d'essai) dans ./site.
# Un changement fait dans les deux dépôts porte le même nom de branche : on prend alors
# cette branche du site ; sinon, main.
set -euo pipefail
depot=https://github.com/wilnergraph92/Goship-express-site
branche="${GITHUB_HEAD_REF:-${GITHUB_REF_NAME:-main}}"
if git ls-remote --exit-code --heads "$depot" "$branche" > /dev/null 2>&1; then ref="$branche"; else ref=main; fi
echo "Dépôt du site : $ref"
git clone --depth 1 --branch "$ref" "$depot" site
