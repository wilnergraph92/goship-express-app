// Lire un code scanné par l'appareil photo.
//
// La lecture elle-même n'est PAS réécrite ici : lib/scan-parser.js est une copie à
// l'identique de assets/js/scan-parser.js du site (le lecteur du poste de scan de la
// Phase 4). Mêmes étiquettes, mêmes règles : Code128 = numéro Goship (GSE-1001-HT),
// QR = lien de suivi (…/index.html?suivi=GSE-1001-HT), carton du vendeur = son suivi.
// essais/essai-logique.mjs vérifie que la copie n'a pas divergé du site.
//
// Ce fichier ne fait que la brancher : il ne décide rien et ne demande rien au serveur.

import 'react-native-url-polyfill/auto';
import './scan-parser';

function lecteur() {
  const g = typeof window !== 'undefined' ? window : globalThis;
  return g.GoshipScan;
}

// → { ok: true, type: 'numero' | 'lien' | 'suivi_vendeur', reference }
//   ou { ok: false, code: 'INVALID_SCAN_FORMAT' }
export function analyser(texte) {
  const l = lecteur();
  if (!l) return { ok: false, code: 'INVALID_SCAN_FORMAT' };
  return l.analyser(texte);
}

// Les formats que la caméra doit lire : ceux de nos étiquettes (Code128, QR) et ceux
// des cartons des vendeurs (Code128, Code39, EAN/UPC, ITF, Data Matrix, PDF417).
export const FORMATS = ['code128', 'qr', 'code39', 'ean13', 'ean8', 'upc_a', 'upc_e', 'itf14', 'datamatrix', 'pdf417'];
