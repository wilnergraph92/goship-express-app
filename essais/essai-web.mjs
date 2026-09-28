// L'application, de bout en bout, sur une base d'essai (jamais la vraie base).
//
// La version web de l'application (même code que sur le téléphone, rendu par
// react-native-web) tourne dans Chromium contre la base jetable du dépôt du site :
//   python3 outils/essais-services/essai-mobile.py --serveur   (dans Goship-express-site)
// qui sert un vrai PostgREST (vraies règles de sécurité) et une doublure de
// l'authentification sur http://localhost:54321.
//
//   npm run essai:web        (construit dist-essai/ puis lance cet essai)
//
// Toute requête vers *.supabase.co est bloquée et fait échouer l'essai.
// Variables : CHROMIUM (chemin du navigateur), GOSHIP_CAPTURES=1 (captures d'écran).

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { demarrer } from './serveur-web.mjs';

const ICI = path.dirname(new URL(import.meta.url).pathname);
const BASE = 'http://localhost:54321';
const WEB = 'http://127.0.0.1:8082';
const MARIE = '11111111-1111-1111-1111-111111111111';
const JEAN = '22222222-2222-2222-2222-222222222222';
const CAPTURES = process.env.GOSHIP_CAPTURES ? path.join(ICI, 'captures') : null;
if (CAPTURES) fs.mkdirSync(CAPTURES, { recursive: true });

const resultats = [];
function verifier(titre, obtenu, attendu) {
  const bon = JSON.stringify(obtenu) === JSON.stringify(attendu);
  console.log(`  ${bon ? 'OK  ' : 'RATÉ'} ${titre}${bon ? '' : `\n       obtenu : ${JSON.stringify(obtenu)}\n       attendu : ${JSON.stringify(attendu)}`}`);
  resultats.push(bon);
  return bon;
}

async function controle(action, corps = {}) {
  const r = await fetch(`${BASE}/essai/${action}`, { method: 'POST', body: JSON.stringify(corps) });
  return r.json();
}
async function sql(requete) {
  const { sortie } = await controle('sql', { requete });
  const lignes = String(sortie || '').split('\n').filter(Boolean);
  return lignes[lignes.length - 1] || '';
}
async function commeClient(uid, requete) {
  return sql(`select set_config('request.jwt.claims', '{"sub":"${uid}","role":"authenticated"}', false); ${requete}`);
}
const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms));
const argent = (n) => Number(n).toFixed(2).replace('.', ',') + ' $';

async function main() {
  // La base d'essai doit répondre, et pas la vraie
  try { await controle('panne', { mode: null }); } catch (e) {
    console.error('Base d\'essai absente : lancez « python3 outils/essais-services/essai-mobile.py --serveur » dans Goship-express-site.');
    process.exit(2);
  }
  const numeros = JSON.parse(await sql("select json_agg(json_build_object('n', numero, 'id', id, 'c', client_id) order by numero)::text from colis where numero like 'GSE-10%';"));
  const colis = (n) => numeros.find((x) => x.n === n);
  const idJean = numeros.find((x) => x.c === JEAN).id;

  const serveur = await demarrer(path.join(ICI, '..', 'dist-essai'), 8082);
  const navigateur = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--no-proxy-server'] });
  const contexte = await navigateur.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR', timezoneId: 'America/Santo_Domingo' });
  const page = await contexte.newPage();

  const production = [];
  const requetes = [];
  const erreursPage = [];
  await contexte.route(/supabase\.co/, (r) => { production.push(r.request().url()); return r.abort(); });
  page.on('request', (r) => { if (r.url().startsWith(BASE + '/rest/')) requetes.push(r.method() + ' ' + r.url().slice(BASE.length)); });
  page.on('pageerror', (e) => erreursPage.push(e.message));

  const id = (t) => page.getByTestId(t);
  const visible = async (t, ms = 10000) => { try { await id(t).first().waitFor({ state: 'visible', timeout: ms }); return true; } catch (e) { return false; } };
  // Une valeur chargée (« — » tant que la base n'a pas répondu)
  const valeur = async (t, ms = 15000) => {
    const fin = Date.now() + ms;
    let v = '';
    while (Date.now() < fin) { v = await texte(t).catch(() => ''); if (v && v !== '—') return v; await attendre(200); }
    return v;
  };
  const texte = async (t) => ((await id(t).first().textContent()) || '').replace(/[\uE000-\uF8FF]/g, '').trim();
  const capture = async (nom) => { if (CAPTURES) await page.screenshot({ path: path.join(CAPTURES, nom + '.png') }); };
  async function onglet(nom) { await id('onglet-' + nom).click(); await attendre(400); }
  async function seConnecter(email, mdp) {
    await id('connexion-email').fill(email);
    await id('connexion-mdp').fill(mdp);
    await id('connexion-entrer').click();
  }
  async function aller(chemin) { await page.goto(WEB + chemin); }
  const cartes = () => page.getByTestId('colis-liste').locator('[data-testid^="colis-GSE-"]');
  const nombreCartes = async () => (await id('colis-liste').count()) ? cartes().count() : 0;

  console.log('A. Démarrage, connexion, aiguillage');
  await aller('/');
  verifier('sans session → écran de connexion', await visible('connexion-email'), true);
  verifier('aucune requête de données avant la connexion', requetes.length, 0);
  await capture('01-connexion');
  await id('connexion-entrer').click();
  verifier('champs vides : message, sans requête', [await visible('connexion-erreur', 3000), requetes.length], [true, 0]);
  await seConnecter('marie@exemple.com', 'mauvais');
  await visible('connexion-erreur');
  verifier('mauvais mot de passe : message clair', await texte('connexion-erreur'), 'E-mail ou mot de passe incorrect.');
  await aller('/colis/' + colis('GSE-1001-HT').id);
  verifier('lien direct vers un colis sans session → connexion', await visible('connexion-email'), true);
  let t0 = Date.now();
  await seConnecter('marie@exemple.com', 'marie-essai-1');
  verifier('après connexion, le lien mène à son colis', await visible('detail-statut', 15000) && (await texte('detail-numero')), 'GSE-1001-HT');
  const tempsConnexion = Date.now() - t0;

  console.log('B. Accueil : les chiffres de la base');
  await aller('/');
  t0 = Date.now();
  await visible('stat-en-cours-nombre', 15000);
  const tempsAccueil = Date.now() - t0;
  const resume = JSON.parse(await commeClient(MARIE, 'select public.mon_resume()::text;'));
  verifier('en cours = mon_resume', await texte('stat-en-cours-nombre'), String(resume.colis.en_cours));
  verifier('à retirer = mon_resume', await texte('stat-disponibles-nombre'), String(resume.colis.disponibles));
  verifier('action requise signalée', await visible('stat-action', 2000), resume.colis.action_requise > 0);
  verifier('solde = mon_resume', await texte('accueil-solde-montant'), argent(resume.factures.solde_usd));
  verifier('nom et code du client', [await texte('accueil-nom'), await texte('accueil-code')],
    [await sql(`select nom_complet from clients where id = '${MARIE}';`), await sql(`select code from clients where id = '${MARIE}';`)]);
  await capture('02-accueil');

  console.log('C. Mes colis : pages, filtres, recherche côté base');
  await onglet('colis');
  t0 = Date.now();
  await visible('colis-liste', 15000);
  await cartes().first().waitFor();
  const tempsListe = Date.now() - t0;
  verifier('première page : 20 colis, total 25', [await nombreCartes(), await texte('colis-total')], [20, '25']);
  const avantPage = requetes.filter((r) => r.includes('/colis?')).length;
  for (let i = 0; i < 6 && (await nombreCartes()) < 25; i += 1) {
    await cartes().last().scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 3000);
    await attendre(700);
  }
  verifier('page suivante au défilement : 25', await nombreCartes(), 25);
  verifier('une requête de plus, pas un rechargement complet', requetes.filter((r) => r.includes('/colis?')).length - avantPage, 1);
  verifier('aucune requête ne demande toutes les étapes de tous les colis',
    requetes.some((r) => r.includes('/colis?') && r.includes('colis_historique') && !r.includes('id=eq.')), false);
  for (const [filtre, attendu] of [['retirer', ['GSE-1002-HT']], ['action', ['GSE-1003-HT']], ['livres', ['GSE-1001-HT']]]) {
    await id('filtre-' + filtre).click();
    await attendre(1200);
    const vus = await cartes().evaluateAll((els) => els.map((e) => e.dataset.testid.slice(6)));
    verifier(`filtre « ${filtre} »`, vus, attendu);
  }
  await id('filtre-tous').click();
  await id('colis-recherche').fill('Marie 07');
  await attendre(1500);
  verifier('recherche « Marie 07 » (par la base)', await nombreCartes(), 1);
  verifier('la recherche est partie au serveur', requetes.some((r) => r.includes('or=') && r.includes('ilike')), true);
  await id('colis-recherche').fill('zzzz');
  await attendre(1500);
  verifier('aucun résultat : message', [await nombreCartes(), await page.getByText('Aucun de vos colis ne correspond.').isVisible()], [0, true]);
  await id('colis-recherche').fill('');
  await attendre(1200);
  verifier('aucun colis de Jean dans la liste', await page.locator('[data-testid="colis-GSE-1026-HT"]').count(), 0);
  await capture('03-colis');

  console.log('D. Détail et étapes (événements réels)');
  const etapes = async () => page.locator('[data-testid="etape"]').allTextContents();
  await aller('/colis/' + colis('GSE-1001-HT').id);
  await visible('detail-statut');
  t0 = Date.now();
  verifier('livré : statut et 6 étapes, la plus récente en haut', [await texte('detail-statut'), await etapes()],
    ['Livré', ['Livré', 'Disponible', 'Centre de distribution', 'Embarqué', 'Emballé', 'Reçu']]);
  await capture('04-detail');
  await aller('/colis/' + colis('GSE-1002-HT').id);
  await visible('detail-statut');
  verifier('opération interne (inspection) invisible', (await etapes()).length, 5);
  // Le statut n'est plus rogné sous l'en-tête : le point au centre de son titre est bien lui
  verifier('le titre du statut est visible, pas caché sous l\'en-tête', await page.evaluate(() => {
    const e = document.querySelector('[data-testid="detail-statut"]');
    const r = e.getBoundingClientRect();
    const dessus = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!dessus && (e === dessus || e.contains(dessus));
  }), true);
  verifier('destination : ville et pays', await page.getByText('Pétion-Ville, Haïti').count(), 1);
  await aller('/colis/' + colis('GSE-1004-HT').id);
  await visible('detail-statut');
  verifier('étape corrigée invisible, statut corrigé', [await texte('detail-statut'), await etapes()], ['Emballé', ['Emballé', 'Reçu']]);
  const tempsDetail = Date.now() - t0;
  await aller('/colis/' + idJean);
  verifier('lien vers le colis de Jean : introuvable, rien de montré',
    [await page.getByText('Introuvable').first().waitFor({ timeout: 8000 }).then(() => true).catch(() => false), await page.getByText('Colis de Jean').count()], [true, 0]);
  const avantLien = requetes.length;
  await aller('/colis/pas-un-identifiant');
  await page.getByText('Introuvable').first().waitFor({ timeout: 8000 });
  verifier('lien mal formé : refusé sans requête', requetes.slice(avantLien).filter((r) => r.includes('/colis?')).length, 0);

  console.log('E. Suivi (même moteur que le site)');
  await aller('/');
  await id('accueil-suivi').fill('GSE-1026-HT');
  await id('accueil-suivi-ok').click();
  verifier('colis d\'un autre : suivi public', await visible('suivi-public'), true);
  verifier('… sans sa description ni son client', [await page.getByText('Colis de Jean').count(), await page.getByText('Jean Pierre').count()], [0, 0]);
  await aller('/suivi?numero=GSE-1002-HT');
  verifier('son propre colis : ouvre son détail', await visible('detail-statut') && (await texte('detail-numero')), 'GSE-1002-HT');
  await aller('/suivi?numero=TBAMARIE0006');
  verifier('par le suivi du vendeur : son colis', await visible('detail-statut') && (await texte('detail-numero')), 'GSE-1006-HT');
  await aller('/suivi?numero=GSE-9999-HT');
  verifier('numéro inconnu : message', await visible('suivi-introuvable'), true);

  console.log('F. Pré-alerte');
  const nbPrealertes = async () => Number(await sql(`select count(*) from prealertes where client_id = '${MARIE}';`));
  const appelsPrealerte = () => requetes.filter((r) => r.includes('creer_prealerte')).length;
  await aller('/prealerte');
  await visible('pa-envoyer');
  let n0 = await nbPrealertes();
  await id('pa-envoyer').click();
  verifier('formulaire vide : erreurs par champ, aucun envoi',
    [await visible('pa-magasin-erreur', 3000), await visible('pa-contenu-erreur', 1000), appelsPrealerte()], [true, true, 0]);
  await id('pa-magasin').fill('Amazon');
  await id('pa-contenu').fill('Écouteurs');
  await id('pa-suivi').fill('ab/cd');
  await id('pa-valeur').fill('12,5x');
  await id('pa-envoyer').click();
  verifier('suivi et valeur illisibles : refusés avant l\'envoi',
    [await visible('pa-suivi-erreur', 3000), await visible('pa-valeur-erreur', 1000), appelsPrealerte()], [true, true, 0]);
  await id('pa-suivi').fill('tba 5555 0001');
  await id('pa-valeur').fill('49,90');
  // Double appui sur une connexion lente : le second appui tombe pendant l'envoi
  await controle('panne', { mode: 'lent', delai: 1500 });
  const envoisAvant = appelsPrealerte();
  await id('pa-envoyer').click();
  await attendre(150);
  await id('pa-envoyer').click({ force: true });
  await id('pa-envoyer').click({ force: true });
  await visible('pa-message-ok', 10000);
  await controle('panne', { mode: null });
  verifier('trois appuis pendant l\'envoi : une seule requête', appelsPrealerte() - envoisAvant, 1);
  verifier('double appui : une seule pré-alerte, confirmée par la base', [await nbPrealertes() - n0, await texte('pa-message-ok')], [1, 'Pré-alerte enregistrée.']);
  verifier('enregistrée telle que la base l\'a mise en forme',
    await sql(`select suivi_transporteur || ':' || valeur_usd from prealertes where client_id = '${MARIE}' order by cree_le desc limit 1;`), 'TBA55550001:49.90');
  await capture('05-prealerte');
  await id('pa-magasin').fill('Amazon');
  await id('pa-contenu').fill('Encore');
  await id('pa-suivi').fill('TBA55550001');
  await id('pa-envoyer').click();
  await visible('pa-suivi-erreur');
  verifier('même suivi : doublon refusé par la base', await texte('pa-suivi-erreur'),
    'Ce numéro de suivi est déjà annoncé : la pré-alerte est dans votre liste.');
  await id('pa-suivi').fill('TBAMARIE0010');
  await id('pa-envoyer').click();
  await visible('pa-suivi-erreur');
  verifier('suivi d\'un colis arrivé : refusé, avec son numéro', await texte('pa-suivi-erreur'), 'Ce colis est déjà arrivé à Miami. (GSE-1010-HT)');
  // La réponse se perd (délai dépassé) alors que la base a bien enregistré : le nouvel
  // essai renvoie la MÊME clé, et la base ne crée rien de plus
  n0 = await nbPrealertes();
  await id('pa-suivi').fill('TBA77770002');
  let coupe = true;
  await page.route('**/rpc/creer_prealerte', async (r) => {
    if (!coupe) return r.continue();
    await r.fetch();
    return r.abort('timedout');
  });
  await id('pa-envoyer').click();
  await visible('pa-message-erreur');
  verifier('réponse perdue : l\'écran ne dit pas « enregistrée »', [await visible('pa-message-ok', 500), await nbPrealertes() - n0], [false, 1]);
  coupe = false;
  await id('pa-envoyer').click();
  await visible('pa-message-ok');
  verifier('nouvel essai : confirmée, toujours UNE pré-alerte', await nbPrealertes() - n0, 1);
  await page.unroute('**/rpc/creer_prealerte');
  await context_offline(contexte, true);
  await id('pa-magasin').fill('eBay');
  await id('pa-contenu').fill('Hors ligne');
  await id('pa-suivi').fill('');
  await id('pa-envoyer').click();
  await visible('pa-message-erreur');
  verifier('hors ligne : message réseau, rien d\'enregistré', [await texte('pa-message-erreur'), await nbPrealertes() - n0],
    ['Vérifiez votre connexion Internet, puis réessayez.', 1]);
  await context_offline(contexte, false);
  n0 = await nbPrealertes();
  await id('pa-supprimer').first().click();
  await id('pa-supprimer-oui').click();
  await visible('pa-message-ok');
  verifier('supprimer (avec confirmation)', await nbPrealertes() - n0, -1);
  await aller('/prealerte?suivi=TBA12340000');
  await visible('pa-suivi');
  verifier('code renvoyé par le scanner : prérempli', await id('pa-suivi').inputValue(), 'TBA12340000');

  console.log('G. Factures, paiements, solde : les valeurs de la base');
  const factures = JSON.parse(await commeClient(MARIE, 'select public.mes_factures()::text;'));
  await aller('/factures');
  await visible('factures-solde');
  verifier('solde du compte = mon_resume', await valeur('factures-solde'), argent(resume.factures.solde_usd));
  const ouvertes = factures.filter((f) => f.statut !== 'annulee' && Number(f.solde_usd) > 0);
  for (const f of ouvertes) {
    verifier(`${f.numero} : reste dû affiché = solde de la base`, await texte(`facture-${f.numero}-montant`), argent(f.solde_usd));
  }
  await id('factures-onglet-payee').click();
  await attendre(400);
  const payee = factures.find((f) => Number(f.solde_usd) === 0);
  verifier('onglet « Payées »', await visible(`facture-${payee.numero}`, 3000), true);
  await capture('06-factures');
  const partielle = factures.find((f) => f.etat === 'partielle');
  await aller('/facture/' + partielle.id);
  await visible('facture-total');
  verifier('détail : total, payé, solde, état = base',
    [await texte('facture-total'), await texte('facture-paye'), await texte('facture-solde'), await texte('facture-etat')],
    [argent(partielle.montant_usd), argent(partielle.paye_usd), argent(partielle.solde_usd), 'Payée en partie']);
  verifier('paiements reçus listés', await page.locator('[data-testid="facture-paiement"]').count(), partielle.paiements.length);
  await capture('07-facture');
  await id('facture-payer').click();
  await visible('paiement-montant');
  verifier('payer : le montant proposé est le solde', await texte('paiement-montant'), argent(partielle.solde_usd));
  const factureJean = await sql(`select id from factures where client_id = '${JEAN}' limit 1;`);
  await aller('/facture/' + factureJean);
  verifier('lien vers la facture de Jean : introuvable', await page.getByText('Introuvable').first().waitFor({ timeout: 8000 }).then(() => true).catch(() => false), true);

  console.log('H. Isolation depuis la session de l\'application');
  const direct = await page.evaluate(async ({ base, jean, idJean: c }) => {
    const cle = Object.keys(localStorage).find((k) => /^sb-.*-auth-token$/.test(k));
    const jeton = JSON.parse(localStorage.getItem(cle)).access_token;
    const h = { apikey: 'cle-publique-essai', Authorization: 'Bearer ' + jeton };
    const lire = async (u) => (await fetch(base + '/rest/v1' + u, { headers: h })).json();
    return {
      colis: await lire(`/colis?select=id&client_id=eq.${jean}`),
      unColis: await lire(`/colis?select=id&id=eq.${c}`),
      factures: await lire(`/factures?select=id&client_id=eq.${jean}`),
      paiements: await lire('/paiements?select=id,factures!inner(client_id)&factures.client_id=eq.' + jean),
    };
  }, { base: BASE, jean: JEAN, idJean });
  verifier('avec son propre jeton, Marie n\'obtient rien de Jean', direct, { colis: [], unColis: [], factures: [], paiements: [] });

  console.log('I. Réseau : hors ligne, panne, lenteur');
  await aller('/colis');
  await cartes().first().waitFor();
  await context_offline(contexte, true);
  await onglet('index');
  await onglet('colis');
  verifier('hors ligne : les colis déjà chargés restent, avec un bandeau', [await visible('bandeau-erreur'), (await nombreCartes()) > 0], [true, true]);
  verifier('le bandeau le dit', await texte('bandeau-erreur'), 'Connexion indisponible. Certaines données peuvent ne pas être à jour.');
  await capture('08-hors-ligne');
  await context_offline(contexte, false);
  await id('bandeau-erreur').click();
  await attendre(2000);
  verifier('reconnexion : le bandeau disparaît', await id('bandeau-erreur').count(), 0);
  await controle('panne', { mode: 'serveur' });
  await aller('/factures');
  verifier('serveur en panne : message et « Réessayer »', await visible('reessayer', 30000), true);
  verifier('le message est clair', await page.getByText('Le service est momentanément indisponible. Réessayez dans quelques minutes.').isVisible(), true);
  await controle('panne', { mode: null });
  await id('reessayer').click();
  verifier('service rétabli : « Réessayer » charge les factures', await visible('factures-solde', 15000) && (await valeur('factures-solde')), argent(resume.factures.solde_usd));
  await controle('panne', { mode: 'lent', delai: 25000 });
  t0 = Date.now();
  await aller('/facture/' + partielle.id);
  const delaiVu = await page.getByText('La réponse tarde trop', { exact: false }).first().waitFor({ timeout: 40000 }).then(() => true).catch(() => false);
  verifier(`serveur trop lent : abandon et message après ~${Math.round((Date.now() - t0) / 1000)} s`, delaiVu, true);
  await controle('panne', { mode: null });
  verifier('aucune erreur JavaScript non rattrapée', erreursPage, []);

  console.log('J. Session expirée, déconnexion');
  await aller('/');
  await visible('stat-en-cours-nombre');
  await controle('revoquer', { email: 'marie@exemple.com' });
  await onglet('colis');
  verifier('session révoquée : retour à la connexion, avec un message', await visible('connexion-info', 20000) && (await texte('connexion-info')),
    'Votre session a expiré : reconnectez-vous pour continuer.');
  await controle('retablir', { email: 'marie@exemple.com' });
  await seConnecter('marie@exemple.com', 'marie-essai-1');
  await visible('stat-en-cours-nombre', 15000);
  await onglet('compte');
  await id('compte-deconnexion').click();
  await id('compte-deconnexion-oui').click();
  await visible('connexion-email');
  await page.goBack();
  await attendre(1500);
  verifier('après déconnexion, « retour » ne rouvre aucun écran privé',
    [await visible('connexion-email', 5000), await page.getByText('Marie-Ange Dorvil').count()], [true, 0]);
  verifier('plus de session dans le stockage', await page.evaluate(() => Object.keys(localStorage).filter((k) => /auth-token/.test(k)).length), 0);

  console.log('J bis. Supprimer mon compte (la base décide)');
  await seConnecter('marie@exemple.com', 'marie-essai-1');
  await visible('stat-en-cours-nombre', 15000);
  await onglet('compte');
  await id('compte-supprimer').click();
  await visible('compte-supprimer-question');
  await id('compte-supprimer-oui').click();
  verifier('Marie, colis en route : refusé, avec la raison de la base',
    await visible('compte-supprimer-refus', 15000) && (await texte('compte-supprimer-refus')).startsWith('Vous avez encore des colis'), true);
  verifier('… et rien n\'a changé', await sql("select nom_complet || '|' || (supprime_le is null) from clients where email = 'marie@exemple.com';"),
    'Marie-Ange Dorvil|true');
  await id('compte-deconnexion').click();
  await id('compte-deconnexion-oui').click();
  await seConnecter('lea@exemple.com', 'lea-essai-1');
  await visible('stat-en-cours-nombre', 15000);
  await onglet('compte');
  await id('compte-supprimer').click();
  await id('compte-supprimer-oui').click();
  verifier('Léa, rien en cours : supprimée, retour à la connexion avec « Votre compte a été supprimé. »',
    await visible('connexion-ok', 20000) && (await texte('connexion-ok')), 'Votre compte a été supprimé.');
  verifier('la base : profil vidé, date de suppression', await sql("select nom_complet || '|' || email || '|' || (supprime_le is not null) "
    + "from clients where id = 'eeeeeeee-0000-0000-0000-00000000000e';"), 'Compte supprimé||true');
  verifier('plus de session dans le stockage', await page.evaluate(() => Object.keys(localStorage).filter((k) => /auth-token/.test(k)).length), 0);
  await id('connexion-email').fill('lea@exemple.com');
  await id('connexion-mdp').fill('lea-essai-1');
  await page.keyboard.press('Enter');
  verifier('Léa ne peut plus se connecter', await visible('connexion-erreur', 15000), true);

  console.log('K. Compte de l\'équipe, inscription, langue');
  await seConnecter('employe@goship.test', 'employe-essai-1');
  verifier('employée : avertissement « espace client », pas d\'adresse de Miami',
    [await visible('accueil-equipe', 15000), await page.getByText('8140 NW 74th Ave Unit 3').count()], [true, 0]);
  await onglet('colis');
  await visible('colis-liste');
  verifier('employée : « Mes colis » ne montre pas les colis des clients', await nombreCartes(), 0);
  await onglet('compte');
  await id('compte-deconnexion').click();
  await id('compte-deconnexion-oui').click();
  await visible('connexion-creer');
  await id('connexion-creer').click();
  await visible('in-creer');
  await id('in-nom').fill('Rose Nouvelle');
  await id('in-email').fill('rose@exemple');
  await id('in-mdp').fill('123');
  await id('in-creer').click();
  verifier('inscription : e-mail et mot de passe invalides refusés', [await visible('in-email-erreur', 3000), await visible('in-mdp-erreur', 1000)], [true, true]);
  await id('in-email').fill('marie@exemple.com');
  await id('in-mdp').fill('secret-rose-1');
  await id('in-creer').click();
  verifier('adresse déjà inscrite : message', await visible('in-email-erreur', 8000) && (await texte('in-email-erreur')).startsWith('Un compte existe déjà'), true);
  await id('in-email').fill('rose@exemple.com');
  await id('in-creer').click();
  verifier('nouveau compte : accueil avec son code GSE', await visible('accueil-code', 15000) && /^GSE-\d{4,}$/.test(await texte('accueil-code')), true);
  verifier('la base a créé le client', await sql("select count(*) from clients where email = 'rose@exemple.com';"), '1');
  await onglet('compte');
  await id('compte-notifications').waitFor();
  verifier('notifications : état réel (indisponibles dans un navigateur)', (await texte('compte-notifications')).includes('Indisponibles sur cet appareil'), true);
  verifier('version affichée', ((await texte('compte-version')).match(/Version [\d.]+(?: \(\d+\))?/) || [''])[0], 'Version 1.0.0');
  await page.getByText('Langue').click();
  await id('langue-ht').click();
  await attendre(500);
  verifier('langue créole : onglets traduits', await texte('onglet-index'), 'Akèy');
  await page.reload();
  await id('onglet-index').waitFor();
  verifier('la langue choisie reste après relance', await texte('onglet-index'), 'Akèy');

  console.log('L. Accessibilité et chiffres');
  const sansNom = await page.evaluate(() => [...document.querySelectorAll('[role="button"],[role="tab"],button')]
    .filter((b) => b.offsetParent && !(b.getAttribute('aria-label') || b.textContent.trim())).length);
  verifier('tout bouton visible a un nom lisible par un lecteur d\'écran', sansNom, 0);
  const petits = await page.evaluate(() => [...document.querySelectorAll('[role="button"],[role="tab"]')]
    .filter((b) => b.offsetParent).map((b) => b.getBoundingClientRect()).filter((r) => r.width < 40 && r.height < 40).length);
  verifier('zones tactiles d\'au moins 40 px', petits, 0);
  verifier('aucune requête vers la vraie base', production, []);
  console.log(`  Temps (base locale) : connexion ${tempsConnexion} ms · accueil ${tempsAccueil} ms · liste ${tempsListe} ms · trois détails ${tempsDetail} ms`);

  await navigateur.close();
  serveur.close();
  console.log(`${resultats.length} vérifications, ${resultats.filter(Boolean).length} réussies.`);
  process.exit(resultats.every(Boolean) ? 0 : 1);
}

async function context_offline(contexte, horsLigne) {
  await contexte.setOffline(horsLigne);
  await attendre(200);
}

main().catch((e) => { console.error(e); process.exit(1); });
