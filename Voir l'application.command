#!/bin/sh
# Lance l'application GoShip Express pour la tester sur votre téléphone.
# 1. Installez « Expo Go » depuis le Play Store (Android) ou l'App Store (iPhone).
# 2. Double-cliquez sur ce fichier.
# 3. Scannez le QR code affiché avec Expo Go (Android) ou l'appareil photo (iPhone).
export PATH="$HOME/.outils/node/bin:$PATH"
cd "$(dirname "$0")" || exit 1
clear
echo "GoShip Express — application mobile"
echo "Ouvrez « Expo Go » sur votre téléphone et scannez le QR code ci-dessous."
echo "Pour arrêter : fermez cette fenêtre ou appuyez sur Ctrl+C."
echo
exec npx expo start
