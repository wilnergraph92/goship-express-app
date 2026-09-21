#!/bin/sh
# Lance l'application en mode « aperçu navigateur » (pour vérifier l'affichage).
export PATH="$HOME/.outils/node/bin:$PATH"
cd "$(dirname "$0")" || exit 1
exec npx expo start --web --port 8081
