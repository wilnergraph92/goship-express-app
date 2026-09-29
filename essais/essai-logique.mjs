// Ce qui se vérifie sans téléphone ni navigateur : le lecteur de codes (copie de celui
// du site), la validation, le classement des erreurs, le journal, les traductions, la
// configuration, et l'absence de secret dans le dépôt.
//
//   npm run essai
//   GOSHIP_SITE=../Goship-express-site npm run essai   (compare aussi avec le site)

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const RACINE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const lire = (f) => fs.readFileSync(path.join(RACINE, f), 'utf8');
const resultats = [];
function verifier(titre, obtenu, attendu) {
  const bon = JSON.stringify(obtenu) === JSON.stringify(attendu);
  console.log(`  ${bon ? 'OK  ' : 'RATÉ'} ${titre}${bon ? '' : `\n       obtenu : ${JSON.stringify(obtenu)}\n       attendu : ${JSON.stringify(attendu)}`}`);
  resultats.push(bon);
}
// Un module sans import, chargé tel quel
async function module_(f) {
  return import('data:text/javascript;base64,' + Buffer.from(lire(f)).toString('base64'));
}

console.log('A. Le lecteur de codes (lib/scan-parser.js, copie du site)');
const site = process.env.GOSHIP_SITE || path.join(RACINE, '..', 'Goship-express-site');
const copieSite = path.join(site, 'assets', 'js', 'scan-parser.js');
if (fs.existsSync(copieSite)) {
  verifier('identique à assets/js/scan-parser.js du site', lire('lib/scan-parser.js') === fs.readFileSync(copieSite, 'utf8'), true);
} else {
  console.log('  (site absent : comparaison sautée — GOSHIP_SITE=chemin du dépôt du site)');
}
const bac = { URL };
bac.window = bac;
vm.createContext(bac);
vm.runInContext(lire('lib/scan-parser.js'), bac);
const analyser = (x) => { const r = bac.GoshipScan.analyser(x); return r.ok ? [r.type, r.reference] : [r.code]; };
verifier('Code128 d\'une étiquette', analyser('GSE-1001-HT'), ['numero', 'GSE-1001-HT']);
verifier('QR d\'une étiquette (lien de suivi)', analyser('https://wilnergraph92.github.io/Goship-express-site/index.html?suivi=GSE-1001-HT'), ['lien', 'GSE-1001-HT']);
verifier('suivi Amazon', analyser('TBA123456789000'), ['suivi_vendeur', 'TBA123456789000']);
verifier('suivi USPS lu avec son préfixe', analyser('4203316694001234567890123456789012'), ['suivi_vendeur', '94001234567890123456789012']);
verifier('code illisible', analyser('bonjour'), ['INVALID_SCAN_FORMAT']);
verifier('GSE mal lu', analyser('GSE-10'), ['INVALID_SCAN_FORMAT']);
verifier('QR d\'une facture (lien sans numéro)', analyser('https://exemple.com/facture'), ['INVALID_SCAN_FORMAT']);

console.log('B. Pré-alerte : vérifications avant envoi (lib/validation.js)');
const V = await module_('lib/validation.js');
const pa = (c) => { const r = V.verifierPrealerte({ service: 'aerien', ...c }); return r.valide ? r.propre : r.erreurs; };
verifier('vide', pa({}), { magasin: 'PREALERT_STORE_REQUIRED', description: 'PREALERT_DESCRIPTION_REQUIRED' });
verifier('valide, remis en forme', pa({ magasin: ' Amazon ', description: 'Livre', suivi: 'tba 123 456', valeur: '12,5' }),
  { magasin: 'Amazon', description: 'Livre', suivi_transporteur: 'TBA123456', valeur_usd: 12.5, service: 'aerien' });
verifier('suivi illisible', pa({ magasin: 'A', description: 'B', suivi: 'ab/cd?' }), { suivi: 'INVALID_TRACKING' });
verifier('valeur illisible', pa({ magasin: 'A', description: 'B', valeur: '12,5x' }), { valeur: 'INVALID_VALUE' });
verifier('valeur absurde', pa({ magasin: 'A', description: 'B', valeur: '1000000' }), { valeur: 'INVALID_VALUE' });
verifier('service inconnu', pa({ magasin: 'A', description: 'B', service: 'fusee' }), { service: 'INVALID_SERVICE' });
verifier('mêmes codes que la base (creer_prealerte)',
  ['PREALERT_STORE_REQUIRED', 'PREALERT_DESCRIPTION_REQUIRED', 'INVALID_TRACKING', 'INVALID_VALUE', 'INVALID_SERVICE']
    .every((c) => lire('lib/erreurs.js').includes(`'${c}'`)), true);

console.log('C. Les erreurs (lib/erreurs.js)');
const E = await module_('lib/erreurs.js');
const type = (e) => E.classer(e).type;
verifier('réseau (téléphone)', type({ message: 'TypeError: Network request failed' }), 'reseau');
verifier('réseau (navigateur)', type({ message: 'TypeError: Failed to fetch' }), 'reseau');
verifier('réseau (authentification)', type({ name: 'AuthRetryableFetchError', message: 'x' }), 'reseau');
verifier('délai dépassé', type({ message: 'AbortError: The operation was aborted', hint: 'Request was aborted (timeout or manual cancellation)' }), 'delai');
verifier('règle métier', E.classer({ message: 'PREALERT_DUPLICATE', details: 'phrase', hint: 'goship' }), { type: 'metier', code: 'PREALERT_DUPLICATE', detail: 'phrase' });
verifier('permission refusée par la base', type({ message: 'PERMISSION_DENIED', hint: 'goship' }), 'refus');
verifier('jeton expiré', type({ code: 'PGRST301', message: 'JWT expired' }), 'session');
verifier('renouvellement impossible', type({ message: 'Invalid Refresh Token: Refresh Token Not Found' }), 'session');
verifier('règle de sécurité (42501, 403)', [type({ code: '42501' }), type({ status: 403 })], ['refus', 'refus']);
verifier('serveur en panne (503)', type({ message: 'Service indisponible', status: 503 }), 'serveur');
verifier('inconnue, jamais « undefined »', E.messageErreur(undefined, (k) => k), 'err.inconnue');
const phrase = E.messageErreur({ message: 'PREALERT_ALREADY_RECEIVED', details: "Ce colis est déjà arrivé : c'est le colis GSE-1010-HT.", hint: 'goship' }, (k) => k);
verifier('le numéro du colis déjà arrivé est repris', phrase, 'err.PREALERT_ALREADY_RECEIVED (GSE-1010-HT)');
const sale = 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc marie@exemple.com sb_secret_abcdef ExponentPushToken[xyz] "password":"secret"';
verifier('le journal masque jeton, e-mail, clé, téléphone, mot de passe',
  E.nettoyer(sale), 'Bearer [jeton] [e-mail] sb_secret_[clé] ExponentPushToken[…] "password":"[masqué]"');
verifier('aucune console dans le code de l\'application, hors journal()',
  fichiers(['app', 'components', 'lib']).filter((f) => !f.endsWith('erreurs.js') && /console\.(log|warn|error|info)/.test(lire(f))), []);

console.log('D. Traductions (lib/i18n.js)');
const src = lire('lib/i18n.js');
const T = vm.runInNewContext('(' + /const T = (\{[\s\S]*?\n\});/.exec(src)[1] + ')');
const manques = Object.entries(T).flatMap(([k, v]) => ['fr', 'en', 'es', 'ht'].filter((l) => !v[l]).map((l) => k + ':' + l));
verifier(`${Object.keys(T).length} textes, chacun en fr, en, es, ht`, manques, []);
const code = fichiers(['app', 'components', 'lib']).map(lire).join('\n');
// Les clés composées (t('err.' + type)) sont vérifiées plus bas, valeur par valeur
const utilisees = [...new Set([...code.matchAll(/\bt\('([A-Za-z_.]+)'/g)].map((m) => m[1]))].filter((k) => !k.endsWith('.'));
verifier('tout texte utilisé existe', utilisees.filter((k) => !T[k]), []);
const dynamiques = [
  ...['reseau', 'delai', 'session', 'refus', 'introuvable', 'serveur', 'inconnue', 'metier'].map((x) => 'err.' + x),
  ...['reseau', 'delai', 'session', 'refus', 'introuvable', 'erreur'].map((x) => 'etat.' + x),
  ...['a_payer', 'partielle', 'en_retard', 'payee', 'annulee'].map((x) => 'fa.etat.' + x),
  ...['active', 'refusee', 'indisponible', 'non_configuree', 'erreur', 'inconnue'].map((x) => 'cp.notif.' + x),
  ...['paypal', 'banque', 'azul', 'moncash', 'natcash', 'especes', 'transfert', 'autre'].map((x) => 'moyen.' + x),
  ...['email', 'whatsapp', 'push'].map((x) => 'msg.' + x),
  ...['recu', 'emballe', 'embarque', 'distribution', 'succursale', 'disponible', 'livre', 'incident'].map((x) => 'statut.' + x),
  ...[1, 2, 3, 4, 5, 6, 7].map((x) => 'etape.' + x),
  ...E.CODES_METIER.map((x) => 'err.' + x),
];
verifier('toute clé composée (états, moyens, statuts, codes) existe', dynamiques.filter((k) => !T[k]), []);
verifier('aucun texte en dur « [à définir] » montré aux clients', Object.values(T).some((v) => /\[.*(définir|defined).*\]/i.test(v.fr + v.en)), false);

console.log('E. Configuration et sécurité');
const app = JSON.parse(lire('app.json')).expo;
verifier('identifiants stables', [app.ios.bundleIdentifier, app.android.package, app.scheme], ['com.goshipexpress.app', 'com.goshipexpress.app', 'goshipexpress']);
verifier('version et numéros de build', [app.version, typeof app.ios.buildNumber, typeof app.android.versionCode], ['1.0.0', 'string', 'number']);
verifier('micro, superposition et stockage refusés sur Android', ['RECORD_AUDIO', 'SYSTEM_ALERT_WINDOW', 'READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE']
  .every((p) => app.android.blockedPermissions.includes('android.permission.' + p)), true);
const camera = app.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-camera')[1];
verifier('caméra sans micro', [camera.microphonePermission, camera.recordAudioAndroid], [false, false]);
verifier('ni localisation, ni contacts, ni photos demandés', JSON.stringify(app).match(/Location|Contacts|PhotoLibrary|expo-image-picker|expo-location/g), null);
verifier('sauvegarde Android désactivée (la session ne part pas dans une sauvegarde)', app.android.allowBackup, false);
verifier('textes d\'autorisation traduits (fr, en, es)', Object.keys(app.locales).sort(), ['en', 'es', 'fr']);
const eas = JSON.parse(lire('eas.json'));
verifier('profils EAS : development, preview, production — tous sur la production', Object.keys(eas.build).map((p) => eas.build[p].env.EXPO_PUBLIC_GOSHIP_ENV),
  ['production', 'production', 'production']);
verifier('numéros de build gérés par EAS, toujours croissants', [eas.cli.appVersionSource, eas.build.production.autoIncrement], ['remote', true]);
// (ce fichier-ci est exclu : il contient exprès de faux exemples, pour éprouver le journal)
const tout = fichiers(['.'], /node_modules|\.git\/|dist|essais\/captures|essai-logique\.mjs/).filter((f) => /\.(js|jsx|mjs|json|md|sh|command|yml)$/.test(f));
const secrets = tout.filter((f) => /service_role"?\s*[:=]|sb_secret_[A-Za-z0-9]|eyJhbGciOi[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}|-----BEGIN (RSA |EC )?PRIVATE KEY/.test(lire(f)));
verifier('aucun secret dans le dépôt (service_role, clé secrète, jeton, clé privée)', secrets, []);
verifier('la seule clé Supabase est la clé publiable', (lire('config.js').match(/sb_[a-z]+_/g) || []), ['sb_publishable_']);

function fichiers(dossiers, exclure) {
  const out = [];
  const parcourir = (d) => {
    for (const n of fs.readdirSync(path.join(RACINE, d))) {
      const rel = path.join(d, n);
      if (exclure && exclure.test(rel + (fs.statSync(path.join(RACINE, rel)).isDirectory() ? '/' : ''))) continue;
      if (n === 'node_modules' || n === '.git') continue;
      if (fs.statSync(path.join(RACINE, rel)).isDirectory()) parcourir(rel);
      else out.push(rel);
    }
  };
  dossiers.forEach(parcourir);
  return out;
}

console.log('F. Le coffre de la session (lib/coffre.js)');
// coffre.js chargé avec de faux modules : un stockage ordinaire et un trousseau qui
// marche, ou qui refuse tout (application de simulateur non signée, vieil appareil)
async function coffreAvec(trousseauEnPanne) {
  const ordinaire = new Map();
  const trousseau = new Map();
  const panne = () => { if (trousseauEnPanne) throw new Error('errSecMissingEntitlement'); };
  globalThis.__coffre = {
    Platform: { OS: 'ios' },
    AsyncStorage: {
      getItem: async (k) => (ordinaire.has(k) ? ordinaire.get(k) : null),
      setItem: async (k, v) => { ordinaire.set(k, v); },
      removeItem: async (k) => { ordinaire.delete(k); },
    },
    SecureStore: {
      getItemAsync: async (k) => { panne(); return trousseau.has(k) ? trousseau.get(k) : null; },
      setItemAsync: async (k, v) => { panne(); trousseau.set(k, v); },
      deleteItemAsync: async (k) => { panne(); trousseau.delete(k); },
    },
  };
  const source = lire('lib/coffre.js')
    .replace(/^import .*$/gm, '')
    .replace(/^/, 'const { Platform, AsyncStorage, SecureStore } = globalThis.__coffre;\n');
  const m = await import('data:text/javascript;base64,' + Buffer.from(source + `\n// ${Math.random()}`).toString('base64'));
  return { coffre: m.coffre, ordinaire, trousseau };
}
const session = JSON.stringify({ access_token: 'x'.repeat(2500), user: { id: 'u' } }); // plus d'un morceau
{
  const { coffre, ordinaire, trousseau } = await coffreAvec(false);
  await coffre.setItem('sb-auth', session);
  verifier('trousseau : session relue entière (plusieurs morceaux)', await coffre.getItem('sb-auth'), session);
  verifier('trousseau : aucune copie en clair', [ordinaire.size, trousseau.get('sb-auth.n')], [0, '2']);
  ordinaire.set('ancienne', 'jeton'); // session d'une ancienne version, en clair
  verifier('ancienne session en clair : lue', await coffre.getItem('ancienne'), 'jeton');
  verifier('… puis déplacée au trousseau', [ordinaire.has('ancienne'), await coffre.getItem('ancienne')], [false, 'jeton']);
  await coffre.removeItem('sb-auth');
  verifier('déconnexion : plus rien', await coffre.getItem('sb-auth'), null);
}
{
  const { coffre } = await coffreAvec(true);
  await coffre.setItem('sb-auth', session);
  const lectures = [await coffre.getItem('sb-auth'), await coffre.getItem('sb-auth'), await coffre.getItem('sb-auth')];
  verifier('trousseau en panne : la session reste lisible, lecture après lecture', lectures.every((l) => l === session), true);
  await coffre.removeItem('sb-auth');
  verifier('trousseau en panne : la déconnexion efface quand même', await coffre.getItem('sb-auth'), null);
}

console.log('G. Mise en forme (lib/format.js)');
{
  const PAYS = { 'pays.HT': 'Haïti', 'pays.DO': 'République dominicaine', 'pays.US': 'États-Unis' };
  const source = lire('lib/format.js').replace(/^import .*$/gm, 'const traduire = (k) => (' + JSON.stringify(PAYS) + ')[k] || k;');
  const F = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  verifier('nom de ville tapé en minuscules ou en capitales', ['san isidro', 'PORT-AU-PRINCE', '  cap-haïtien ', 'santo domingo este', 'la romana']
    .map(F.nomDeLieu), ['San Isidro', 'Port-au-Prince', 'Cap-Haïtien', 'Santo Domingo Este', 'La Romana']);
  verifier('destination : ville et pays, ou le pays seul', [F.destinationLisible({ destination: 'san isidro', pays_destination: 'DO' }),
    F.destinationLisible({ destination: '', pays_destination: 'HT' })], ['San Isidro, République dominicaine', 'Haïti']);
  const maintenant = new Date().toISOString();
  verifier('« aujourd\'hui » sans majuscule au milieu d\'une phrase', [F.dateRelative(maintenant, 'fr').split(' ')[0], F.dateRelative(maintenant, 'fr', true).split(' ')[0]],
    ["Aujourd'hui", "aujourd'hui"]);
  verifier('une date chiffrée reste telle quelle', F.dateRelative('2026-01-05T15:00:00Z', 'fr', true).slice(0, 10), '05/01/2026');
}

console.log('H. Continuer avec Google (lib/connexion-sociale.js)');
{
  const S = await module_('lib/connexion-sociale.js');
  const reglages = (corps, ok = true) => async (url, opts) => ({ ok, url, opts, json: async () => corps });
  let vu = null;
  const espion = async (url, opts) => { vu = [url, opts.headers.apikey]; return { ok: true, json: async () => ({ external: { google: true } }) }; };
  verifier('réglages publics de Supabase lus avec la clé publique', [await S.fournisseursActifs('https://x.supabase.co/', 'cle', espion), vu],
    [['google'], ['https://x.supabase.co/auth/v1/settings', 'cle']]);
  verifier('Google désactivé dans Supabase : aucun bouton', await S.fournisseursActifs('u', 'k', reglages({ external: { google: false, email: true } })), []);
  verifier('un fournisseur que l\'application ne connaît pas : ignoré', await S.fournisseursActifs('u', 'k', reglages({ external: { github: true } })), []);
  verifier('réponse en erreur ou réseau coupé : aucun bouton',
    [await S.fournisseursActifs('u', 'k', reglages({}, false)), await S.fournisseursActifs('u', 'k', async () => { throw new TypeError('Network request failed'); })],
    [[], []]);
  verifier('retour avec des jetons (après #)', S.issueRetour(S.lireRetour('goshipexpress://connexion#access_token=a.b.c&refresh_token=r1&expires_in=3600&token_type=bearer')),
    { jetons: { access_token: 'a.b.c', refresh_token: 'r1' } });
  verifier('retour avec un code (après ?)', S.issueRetour(S.lireRetour('goshipexpress://connexion?code=1234-abcd')), { code: '1234-abcd' });
  verifier('refus du client chez Google : « annulée »',
    S.issueRetour(S.lireRetour('goshipexpress://connexion?error=access_denied&error_description=The+user+denied')), { erreur: 'connexion-annulee' });
  verifier('autre erreur (dans le #) : « échec », texte décodé',
    [S.issueRetour(S.lireRetour('exp://192.168.1.2:8081/--/connexion#error=server_error&error_description=Database%20error')),
     S.lireRetour('x://y#error_description=Database%20error+saving').error_description],
    [{ erreur: 'connexion-echec' }, 'Database error saving']);
  verifier('retour sans rien d\'utile : « échec »', [S.issueRetour(S.lireRetour('goshipexpress://connexion')),
    S.issueRetour(S.lireRetour('goshipexpress://connexion#access_token=seul'))], [{ erreur: 'connexion-echec' }, { erreur: 'connexion-echec' }]);
  verifier('profil à compléter : pays, ville ou téléphone manquant',
    [{ nom_complet: 'Rose', pays: '', ville: '', telephone: '' }, { nom_complet: 'Rose', pays: 'HT', ville: 'Jacmel', telephone: ' ' },
     { nom_complet: 'Rose', pays: 'HT', ville: 'Jacmel', telephone: '+509' }, null].map(S.profilIncomplet), [true, true, false, false]);
  verifier('la session le propose, les deux écrans ont leur bouton', [lire('lib/session.js').includes('connexionAvec('),
    lire('app/connexion.jsx').includes('testID="connexion-google"'), lire('app/inscription.jsx').includes('testID="in-google"')], [true, true, true]);
}

console.log(`${resultats.length} vérifications, ${resultats.filter(Boolean).length} réussies.`);
process.exit(resultats.every(Boolean) ? 0 : 1);
