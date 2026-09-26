// Sert la version web de l'application (dist-essai/), pour les essais seulement.
// Toute adresse inconnue rend index.html : c'est l'application qui choisit l'écran
// (/colis/…, /suivi?numero=…), comme le ferait un lien ouvert sur le téléphone.
//
//   node essais/serveur-web.mjs [dossier] [port]

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const racine = path.resolve(process.argv[2] || 'dist-essai');
const port = Number(process.argv[3] || 8082);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.css': 'text/css',
};

export function demarrer(dossier = racine, numero = port) {
  const serveur = http.createServer((req, res) => {
    const chemin = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let fichier = path.join(dossier, chemin);
    if (!fichier.startsWith(dossier) || !fs.existsSync(fichier) || fs.statSync(fichier).isDirectory()) {
      fichier = path.join(dossier, 'index.html');
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(fichier)] || 'application/octet-stream' });
    fs.createReadStream(fichier).pipe(res);
  });
  return new Promise((ok) => serveur.listen(numero, '127.0.0.1', () => ok(serveur)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  demarrer().then(() => console.log(`Application web d'essai : http://127.0.0.1:${port}/`));
}
