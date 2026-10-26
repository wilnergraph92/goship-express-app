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
verifier('QR d\'une étiquette (lien de suivi)', analyser('https://goshipexpress.net/index.html?suivi=GSE-1001-HT'), ['lien', 'GSE-1001-HT']);
verifier('QR d\'une ancienne étiquette (GitHub Pages)', analyser('https://wilnergraph92.github.io/Goship-express-site/index.html?suivi=GSE-1001-HT'), ['lien', 'GSE-1001-HT']);
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

console.log('I. L\'accueil sans colis livré, l\'historique (lib/api.js)');
{
  const F = vm.runInNewContext('(' + /export const FILTRES = (\{[\s\S]*?\n\});/.exec(lire('lib/api.js'))[1] + ')');
  const STATUTS = ['recu', 'emballe', 'embarque', 'distribution', 'succursale', 'disponible', 'livre', 'incident'];
  verifier('filtre « actifs » (accueil) : les huit statuts officiels sauf « livré »', F.actifs.slice().sort(), STATUTS.filter((x) => x !== 'livre').sort());
  verifier('« actifs » et « livrés » se partagent les statuts : aucun oublié, aucun en double',
    [...F.actifs, ...F.livres].sort(), STATUTS.slice().sort());
  verifier('l\'accueil demande ses colis par ce filtre, l\'historique les livrés avec leur date de livraison',
    [lire('app/(onglets)/index.jsx').includes("filtre: 'actifs'"),
      lire('app/historicite.jsx').includes("filtre: 'livres'") && lire('app/historicite.jsx').includes('livraison: true')], [true, true]);
  verifier('Compte a sa ligne « Historicité », l\'écran est dans la pile de navigation',
    [lire('app/(onglets)/compte.jsx').includes("id=\"compte-historicite\""),
      lire('app/_layout.jsx').includes('<Stack.Screen name="historicite" />')], [true, true]);
  const source = lire('lib/api.js').replace(/^import .*$/gm, '');
  const A = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  const colis = { id: 'c1', numero: 'GSE-1001-HT', statut: 'livre' };
  const livre = (c) => { const r = A.avecLivraison(c); return [r.livre_le, 'colis_historique' in r]; };
  verifier('date de livraison : celle de l\'étape « livré », sans les étapes dans le colis',
    livre({ ...colis, colis_historique: [{ statut: 'livre', cree_le: '2026-09-12T18:03:00+00:00' }] }), ['2026-09-12T18:03:00.000Z', false]);
  verifier('plusieurs étapes « livré » (livré, corrigé, livré à nouveau) : la plus récente',
    livre({ ...colis, colis_historique: [{ cree_le: '2026-09-12T18:03:00+00:00' }, { cree_le: '2026-09-20T09:00:00+00:00' }, { cree_le: '2026-09-15T12:00:00+00:00' }] })[0],
    '2026-09-20T09:00:00.000Z');
  verifier('aucune étape lisible : pas de date (l\'écran retombe sur « Mis à jour »)',
    [livre({ ...colis, colis_historique: [] })[0], livre({ ...colis })[0], livre({ ...colis, colis_historique: [{ cree_le: 'pas une date' }] })[0]], [null, null, null]);
}

console.log('J. L\'adresse en Floride et la date de naissance (lib/adresse.js, lib/naissance.js)');
{
  const AD = await module_('lib/adresse.js');
  const N = await module_('lib/naissance.js');
  const conf = (await import('data:text/javascript;base64,' + Buffer.from(lire('config.js')).toString('base64'))).default;
  const a = conf.adresseMiami;
  verifier('les valeurs fixes sont exactement celles fournies par Goship Express',
    [a.ligne1, a.ligne2, a.ville, a.etat, a.zip, a.pays, a.telephone],
    ['8140 NW 74th Ave Unit 3', 'ABX-46780', 'Medley', 'Florida', '33166', 'United States', '786 525-2944']);
  const marie = { nom_complet: 'Marie-Ange  Dorvil', code: 'GSE-4323' };
  const jean = { nom_complet: 'Jean Pierre', code: 'GSE-5001' };
  verifier('huit champs, noms anglais dans l\'ordre des formulaires', AD.champsAdresse(marie, a).map((c) => c.libelle),
    ['Name', 'Address 1', 'Address 2', 'City', 'State', 'Zip Code', 'Country', 'Phone']);
  verifier('Name = nom du compte + code client', AD.champsAdresse(marie, a)[0].valeur, 'Marie-Ange Dorvil GSE-4323');
  verifier('deux clients : chacun son nom et son code, le reste identique',
    [AD.champsAdresse(jean, a)[0].valeur, AD.champsAdresse(marie, a).slice(1).every((c, i) => c.valeur === AD.champsAdresse(jean, a)[i + 1].valeur)],
    ['Jean Pierre GSE-5001', true]);
  verifier('adresse complète : une ligne par information',
    AD.adresseTexte(marie, a).split('\n'),
    ['Marie-Ange Dorvil GSE-4323', '8140 NW 74th Ave Unit 3', 'ABX-46780', 'Medley, Florida 33166', 'United States', '786 525-2944']);
  verifier('sans code, sans nom, sans profil : aucune adresse composée',
    [AD.champsAdresse({ nom_complet: 'Marie' }, a), AD.champsAdresse({ code: 'GSE-1' }, a), AD.champsAdresse({ nom_complet: '  ', code: 'GSE-1' }, a),
      AD.champsAdresse(null, a), AD.adresseTexte({}, a), AD.adressePrete(undefined)], [null, null, null, null, '', false]);
  verifier('l\'écran « Mon adresse » est dans la pile et dans Compte',
    [lire('app/_layout.jsx').includes('<Stack.Screen name="adresse" />'), lire('app/(onglets)/compte.jsx').includes('id="compte-adresse"')], [true, true]);
  verifier('le site et l\'application disent la même chose (Address 2, téléphone)',
    (() => {
      const s = path.join(site, 'assets', 'js', 'api.js');
      return fs.existsSync(s) ? [fs.readFileSync(path.join(site, 'mon-compte.html'), 'utf8').includes('>ABX-46780<'),
        fs.readFileSync(path.join(site, 'mon-compte.html'), 'utf8').includes('>786 525-2944<')] : [true, true];
    })(), [true, true]);

  const lire_ = (j, m, an, auj = '2026-10-19') => N.lireNaissance({ jour: j, mois: m, annee: an }, auj);
  verifier('date valide : le jour civil AAAA-MM-JJ, sans fuseau', lire_('15', '3', '1990').iso, '1990-03-15');
  verifier('un chiffre pour le jour et le mois : complété', lire_('5', '7', '2001').iso, '2001-07-05');
  verifier('vide, incomplet, impossible, avant 1900, futur',
    [lire_('', '', '').code, lire_('15', '3', '90').code, lire_('30', '2', '1990').code, lire_('31', '4', '1990').code, lire_('1', '13', '1990').code,
      lire_('1', '1', '1899').code, lire_('20', '10', '2026').code, lire_('1', '1', '2999').code],
    ['vide', 'incomplet', 'invalide', 'invalide', 'invalide', 'invalide', 'futur', 'futur']);
  verifier('aujourd\'hui est accepté, demain refusé', [lire_('19', '10', '2026').valide, lire_('20', '10', '2026').valide], [true, false]);
  verifier('29 février : année bissextile seulement', [lire_('29', '2', '2000').valide, lire_('29', '2', '2001').valide], [true, false]);
  verifier('« aujourd\'hui » de l\'appareil s\'écrit à la main (pas d\'UTC)', N.aujourdhuiLocal(new Date(2026, 9, 19, 23, 59)), '2026-10-19');
  verifier('affichage sans décalage de jour, dans les quatre langues',
    ['fr', 'en', 'es', 'ht'].map((l) => N.jourCivil('1990-03-15', l)), ['15 mars 1990', 'March 15, 1990', '15 de marzo de 1990', '15 mas 1990']);
  verifier('chaque refus a son message traduit en quatre langues',
    Object.values(N.MESSAGE_NAISSANCE).every((c) => /fr: .*en: .*es: .*ht: /s.test((new RegExp(`'${c.replace('.', '\\.')}': \\{[\\s\\S]*?\\n  \\}|'${c.replace('.', '\\.')}': \\{[^}]*\\}`).exec(lire('lib/i18n.js')) || [''])[0])), true);
  verifier('l\'inscription envoie la date et ne se fait pas sans elle',
    [lire('lib/session.js').includes('date_naissance: champs.date_naissance'), lire('app/inscription.jsx').includes('if (!n.valide) e.naissance')], [true, true]);
}

console.log('K. Les programmes : GOPOINTS, bienvenue, parrainage (lib/programmes.js, app/avantages.jsx)');
{
  const PR = await module_('lib/programmes.js');
  verifier('un code saisi : majuscules, sans espaces, 24 signes au plus',
    [PR.normaliserCodeParrain(' gs ab c 123 '), PR.normaliserCodeParrain('a'.repeat(40)).length, PR.normaliserCodeParrain(null)], ['GSABC123', 24, '']);
  verifier('le code d\'un lien d\'invitation', [PR.codeDuLien('https://x.net/inscription.html?parrain=gsabc123'), PR.codeDuLien('https://x.net/?a=1&parrain=GSZZ9988'), PR.codeDuLien('https://x.net/'), PR.codeDuLien('?parrain=ab')],
    ['GSABC123', 'GSZZ9988', '', '']);
  verifier('le message d\'invitation : code et lien, ou le code seul sans lien',
    [PR.messageInvitation('Rejoins-moi avec mon code {code} : {lien}', 'GSABC123', 'https://x.net/i?parrain=GSABC123'), PR.messageInvitation('Rejoins-moi avec mon code {code} : {lien}', 'GSABC123', '')],
    ['Rejoins-moi avec mon code GSABC123 : https://x.net/i?parrain=GSABC123', 'Rejoins-moi avec mon code GSABC123']);
  const i18n = lire('lib/i18n.js');
  const cles = [...new Set([...i18n.matchAll(/^  '((?:av|err\.(?:OFFER|INSUFFICIENT|DUPLICATE|INVALID_REFERRAL|SELF|ALREADY|REFERRAL))[\w.]*)': \{/gm)].map((m) => m[1]))];
  const complet = cles.filter((c) => {
    const bloc = new RegExp(`'${c.replace(/\./g, '\\.')}': \\{([\\s\\S]*?)\\n  \\},`).exec(i18n);
    return bloc && ['fr', 'en', 'es', 'ht'].every((l) => new RegExp(`\\n    ${l}: '`).test(bloc[1]) || new RegExp(`\\n    ${l}: "`).test(bloc[1]));
  });
  verifier('tous les textes des programmes existent en quatre langues (' + cles.length + ')', complet.length === cles.length && cles.length > 60, true);
  verifier('le texte marketing créole est celui fourni, et la CTA du parrainage aussi',
    [i18n.includes("Envite yon zanmi dekouvri GoShip Express. Lè zanmi ou a kreye kont li epi li fè premye tranzaksyon kalifye li, nou ka rekonpanse nou toulede selon kondisyon pwogram nan."),
     /'av\.refer\.cta': \{[^}]*ht: 'ENVITE YON ZANMI'/s.test(i18n)], [true, true]);
  verifier('chaque code métier des programmes est connu de l\'application et traduit',
    ['OFFER_UNAVAILABLE', 'OFFER_OUT_OF_STOCK', 'OFFER_LIMIT_REACHED', 'INSUFFICIENT_POINTS', 'DUPLICATE_OPERATION', 'INVALID_REFERRAL_CODE', 'SELF_REFERRAL', 'ALREADY_REFERRED', 'REFERRAL_INACTIVE', 'REFERRAL_TOO_LATE', 'REFERRAL_CYCLE']
      .every((c) => lire('lib/erreurs.js').includes(`'${c}'`) && i18n.includes(`'err.${c}'`)), true);
  verifier('l\'écran est dans la pile, dans Compte, et la saisie du code est à l\'inscription',
    [lire('app/_layout.jsx').includes('<Stack.Screen name="avantages" />'), lire('app/(onglets)/compte.jsx').includes('id="compte-avantages"'),
     lire('app/inscription.jsx').includes('testID="in-parrain"'), lire('lib/session.js').includes('code_parrainage:')], [true, true, true, true]);
  verifier('l\'application n\'écrit ni ne calcule aucun avantage : seulement des fonctions de la base',
    ['mon_portefeuille', 'ma_bienvenue', 'mon_parrainage', 'utiliser_points', 'noter_invitation', 'utiliser_code_parrainage', 'regler_ma_preference_anniversaire']
      .every((f) => lire('lib/api.js').includes(`'${f}'`)) && !/from\('(points_|recompenses|parrainages|codes_parrainage)/.test(lire('lib/api.js') + lire('app/avantages.jsx')), true);
  verifier('un échange envoie une clé par appui (un double appui ne dépense qu\'une fois)', lire('app/avantages.jsx').includes('nouvelleCle()'), true);
}

console.log('L. L\'inscription : les mêmes champs que le site (app/inscription.jsx, lib/identite.js, lib/lieux.js)');
{
  const ID = await module_('lib/identite.js');
  const LX = await module_('lib/lieux.js');
  verifier('sexe et document : les mêmes choix que le site', [ID.SEXES, ID.DOCUMENTS], [['M', 'F'], ['passeport', 'cedula']]);
  verifier('un passeport : lettres et chiffres, 5 à 20 signes, espaces et tirets ôtés, majuscules',
    [ID.numeroDocument('passeport', ' ab-12 345 '), ID.numeroDocument('passeport', 'AB12'), ID.numeroDocument('passeport', 'AB 12!45'), ID.numeroDocument('passeport', 'A'.repeat(21))],
    ['AB12345', '', '', '']);
  verifier('une cédula : chiffres seulement, 6 à 15',
    [ID.numeroDocument('cedula', '001-1234567-8'), ID.numeroDocument('cedula', '12345'), ID.numeroDocument('cedula', '12345A'), ID.numeroDocument('cedula', '1'.repeat(16))],
    ['00112345678', '', '', '']);
  verifier('aucun numéro sans document choisi', [ID.numeroDocument('', '123456'), ID.numeroDocument(undefined, 'ABCDEF'), ID.numeroDocument('passeport', null)], ['', '', '']);
  verifier('un nom et un prénom au moins ; sept chiffres au moins au téléphone',
    [ID.nomComplet('Marie'), ID.nomComplet(' Marie  Dorvil '), ID.telephoneValide('+509 37'), ID.telephoneValide('+509 3712 3456')], [false, true, false, true]);
  verifier('un numéro de téléphone d\'exemple par pays, comme le site', Object.keys(ID.TELEPHONE_EXEMPLE), ['HT', 'DO', 'US']);
  const copieLieux = path.join(site, 'assets', 'js', 'lieux.js');
  if (fs.existsSync(copieLieux)) {
    const fen = {};
    fen.window = fen;
    vm.createContext(fen);
    vm.runInContext(fs.readFileSync(copieLieux, 'utf8'), fen);
    verifier('régions, communes et États : identiques à assets/js/lieux.js du site',
      [JSON.stringify(LX.REGIONS) === JSON.stringify(fen.GoshipLieux.REGIONS), JSON.stringify(LX.ETATS_US) === JSON.stringify(fen.GoshipLieux.ETATS_US)], [true, true]);
  } else {
    console.log('  (site absent : comparaison des lieux sautée)');
  }
  const ins = lire('app/inscription.jsx');
  const ordre = ['in-nom', 'in-naissance', 'in-sexe', 'in-document', 'in-numero', 'in-parrain', 'in-pays', 'in-region', 'in-ville', 'in-adresse', 'in-telephone', 'in-email', 'in-mdp']
    .map((id) => ins.indexOf(`testID="${id}"`));
  verifier('tous les champs du site, dans son ordre', ordre.every((i, k) => i > 0 && (k === 0 || i > ordre[k - 1])), true);
  verifier('sans aide sous la date de naissance (comme le site)', ins.includes("t('nz.aide')"), false);
  verifier('le numéro attend le choix du document',
    [ins.includes('editable={!!champs.type_document}'), ins.includes('choisirDocument')], [true, true]);
  verifier('rien ne part sans sexe, document, numéro valide, pays, région, ville et adresse',
    ['e.sexe', 'e.type_document', 'e.numero_document', 'e.pays', 'e.region', 'e.ville', 'e.adresse'].every((x) => ins.includes(x + ' =')), true);
  const sess = lire('lib/session.js');
  verifier('sexe, type de document et numéro partent dans les données d\'inscription',
    ["sexe: champs.sexe", "type_document: champs.type_document", "numero_document: champs.numero_document"].map((x) => sess.includes(x)), [true, true, true]);
  verifier('l\'application ne garde pas le numéro du document : il va à la base, pas au stockage de l\'appareil',
    /numero_document/.test(lire('lib/coffre.js')) || /AsyncStorage[^\n]*numero_document/.test(ins), false);
}

console.log('M. Le jeton du téléphone ne tourne plus en boucle (lib/jeton-appareil.js)');
{
  const J = await module_('lib/jeton-appareil.js');
  // Un faux module de notifications qui fait comme Android (PushTokenModule.kt) : chaque
  // demande du jeton appareil le réémet aux écouteurs, juste après avoir répondu ;
  // « tot » le réémet avant de répondre, l'autre ordre possible.
  const fauxAndroid = (jeton, tot = false) => {
    const ecouteurs = new Set();
    const emettre = (t) => ecouteurs.forEach((f) => f({ type: 'android', data: t }));
    const n = {
      jeton, demandes: 0,
      addPushTokenListener(f) { ecouteurs.add(f); return { remove: () => ecouteurs.delete(f) }; },
      async getDevicePushTokenAsync() {
        n.demandes += 1;
        const t = n.jeton;
        if (tot) emettre(t); else setTimeout(() => emettre(t), 0);
        return { type: 'android', data: t };
      },
      async getExpoPushTokenAsync({ devicePushToken }) {
        const d = devicePushToken || await n.getDevicePushTokenAsync();
        return { data: `ExponentPushToken[${d.data}]` };
      },
      changer(t) { n.jeton = t; emettre(t); },
    };
    return n;
  };
  const attendre = () => new Promise((r) => setTimeout(r, 60));

  // L'ancien code, pour prouver que le faux module reproduit bien la panne
  {
    const n = fauxAndroid('fcm-1');
    let appels = 0;
    const ancien = async () => { await n.getExpoPushTokenAsync({ projectId: 'p' }); appels += 1; };
    const ecoute = n.addPushTokenListener(() => { ancien(); });
    await ancien();
    await attendre();
    ecoute.remove();
    await attendre();
    verifier('l\'ancien écouteur réenregistrait le téléphone sans fin (plus de 10 fois en 60 ms)', appels > 10, true);
  }

  // Le code de l'application : enregistrer() = jetonExpo() puis enregistrer_appareil
  for (const tot of [false, true]) {
    J.oublierJetonAppareil();
    const n = fauxAndroid('fcm-1', tot);
    const enregistres = [];
    const enregistrer = async () => { enregistres.push(await J.jetonExpo(n, 'p')); };
    const ecoute = J.ecouterJetonAppareil(n, () => { enregistrer(); });
    await enregistrer();
    await attendre();
    const ordre = tot ? 'écho avant la réponse' : 'écho après la réponse';
    verifier(`${ordre} : le téléphone est enregistré ${tot ? 'au plus deux fois' : 'une seule fois'}`,
      enregistres.length <= (tot ? 2 : 1) && enregistres.length >= 1, true);
    verifier(`${ordre} : avec le bon jeton Expo`, enregistres.every((j) => j === 'ExponentPushToken[fcm-1]'), true);
    const avant = enregistres.length;
    n.changer('fcm-2');
    await attendre();
    verifier(`${ordre} : un vrai nouveau jeton est enregistré une fois, sans boucle`,
      [enregistres.length - avant, enregistres[enregistres.length - 1]], [1, 'ExponentPushToken[fcm-2]']);
    ecoute.remove();
  }

  // Expo ne redemande pas le jeton appareil : un seul écho par enregistrement
  {
    J.oublierJetonAppareil();
    const n = fauxAndroid('fcm-1');
    await J.jetonExpo(n, 'p');
    verifier('le jeton appareil n\'est demandé qu\'une fois par enregistrement', n.demandes, 1);
  }

  // Déconnexion puis reconnexion : le même jeton se réenregistre pour le nouveau compte
  J.oublierJetonAppareil();
  verifier('après oublierJetonAppareil, le même jeton est de nouveau « nouveau »',
    [J.retenirJetonAppareil('fcm-1'), J.retenirJetonAppareil('fcm-1')], [true, false]);
  verifier('un jeton vide n\'est jamais « nouveau »', [J.retenirJetonAppareil(''), J.retenirJetonAppareil(null)], [false, false]);
  verifier('lib/notifications.js passe par lib/jeton-appareil.js (plus d\'appel direct à addPushTokenListener)',
    [/addPushTokenListener/.test(lire('lib/notifications.js')), lire('lib/notifications.js').includes('ecouterJetonAppareil(Notifications'),
     lire('lib/notifications.js').includes('oublierJetonAppareil()')], [false, true, true]);
}

console.log(`${resultats.length} vérifications, ${resultats.filter(Boolean).length} réussies.`);
process.exit(resultats.every(Boolean) ? 0 : 1);
