// Vérifie le code JavaScript embarqué dans l'application construite : l'environnement
// voulu, et lui seul.
//
//   node essais/controle-paquet.mjs <dossier ou fichier> production
//   node essais/controle-paquet.mjs <dossier ou fichier> essai
//   node essais/controle-paquet.mjs <dossier ou fichier> staging
//
// Production : l'adresse de la vraie base, aucune adresse locale ni d'essai, aucun
// secret. Essai : l'adresse locale, jamais celle de la vraie base (un essai ne doit
// jamais pouvoir écrire en production).
// Pourquoi ce contrôle existe : Metro garde en cache le code déjà compilé ; sans
// « --clear », un build a embarqué l'environnement du build précédent.

import fs from 'node:fs';
import path from 'node:path';

const [cible, env] = process.argv.slice(2);
if (!cible || !['production', 'staging', 'essai'].includes(env)) {
  console.error('Usage : node essais/controle-paquet.mjs <dossier|fichier> production|staging|essai');
  process.exit(2);
}

function paquets(p) {
  if (!fs.existsSync(p)) return [];
  if (fs.statSync(p).isFile()) return [p];
  return fs.readdirSync(p).flatMap((n) => paquets(path.join(p, n)))
    .filter((f) => /\.(js|hbc|bundle)$/.test(f) || /index\.android\.bundle$|main\.jsbundle$/.test(f));
}

const fichiers = paquets(cible);
if (!fichiers.length) { console.error('Aucun paquet JavaScript dans ' + cible); process.exit(2); }
const PROD = 'gpfdyslysqjmojgzggib.supabase.co';
let ok = true;
let juges = 0;
for (const f of fichiers) {
  const t = fs.readFileSync(f).toString('latin1');
  // On ne juge que les paquets qui portent la configuration (config.js : l'adresse du site)
  if (!t.includes('wilnergraph92.github.io/Goship-express-site')) continue;
  juges += 1;
  const constats = {
    production: t.includes(PROD),
    locale: /localhost:54321|127\.0\.0\.1:54321|10\.0\.2\.2:54321/.test(t),
    cleEssai: t.includes('cle-publique-essai'),
    // Une vraie clé ou un vrai jeton (le simple préfixe « sb_secret_ » est dans supabase-js)
    secret: /sb_secret_[A-Za-z0-9][A-Za-z0-9_-]{15,}|eyJhbGciOi[\w-]{10,}\.[\w-]{20,}\.[\w-]{20,}/.test(t),
  };
  // Préproduction : ni la vraie base, ni une adresse locale, ni la clé d'essai
  const attendu = env === 'production'
    ? constats.production && !constats.locale && !constats.secret
    : env === 'staging'
      ? !constats.production && !constats.locale && !constats.cleEssai && !constats.secret
      : !constats.production && constats.locale && constats.cleEssai && !constats.secret;
  console.log(`  ${attendu ? 'OK  ' : 'RATÉ'} ${path.relative(process.cwd(), f)} — ${env} : ${JSON.stringify(constats)}`);
  ok = ok && attendu;
}
if (!juges) { console.error('  RATÉ aucun paquet ne porte la configuration de l\'application'); ok = false; }
process.exit(ok ? 0 : 1);
