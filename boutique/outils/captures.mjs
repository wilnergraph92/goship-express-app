// ==========================================================================
//  Captures brutes de la fiche Google Play
// ==========================================================================
//  La version web de l'application (dist-essai/, `npm run construire:essai`) sur la
//  base d'essai du dépôt du site (`essai-mobile.py --serveur`), jamais sur la vraie
//  base. 360×720 points × 3 = 1080×2160 pixels : Google Play refuse un côté plus de
//  deux fois plus long que l'autre. Les données de vitrine viennent de vitrine.sql.
//
//    SORTIE=dossier LANGUES=fr,en,es CHROMIUM=/chemin/chrome node boutique/outils/captures.mjs
// ==========================================================================
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { demarrer } from '../../essais/serveur-web.mjs';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SORTIE = process.env.SORTIE || path.join(RACINE, 'boutique', 'play', 'brut');
const WEB = 'http://localhost:8082';
const serveur = await demarrer(path.join(RACINE, 'dist-essai'), 8082);
const nav = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--no-proxy-server'] });
const LOCALES = { fr: 'fr-FR', en: 'en-US', es: 'es-ES', ht: 'ht-HT' };
const langues = (process.env.LANGUES || 'fr').split(',');
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
for (const l of langues) {
  const ctx = await nav.newContext({ viewport: { width: 360, height: 720 }, deviceScaleFactor: 3, locale: LOCALES[l], timezoneId: 'America/New_York', isMobile: true, hasTouch: true });
  await ctx.route(/supabase\.co/, (r) => r.abort());
  const page = await ctx.newPage();
  const erreurs = []; page.on('pageerror', (e) => erreurs.push(e.message));
  const id = (t) => page.getByTestId(t);
  const vu = async (t, ms = 15000) => { try { await id(t).first().waitFor({ state: 'visible', timeout: ms }); return true; } catch { return false; } };
  const cap = async (n) => { await attendre(900); await page.screenshot({ path: path.join(SORTIE, `${l}-${n}.png`) }); };
  await page.goto(WEB + '/');
  await vu('connexion-email');
    await id('connexion-email').fill(process.env.EMAIL || 'marie@exemple.com');
  await id('connexion-mdp').fill(process.env.MDP || 'marie-essai-1');
  await id('connexion-entrer').click();
  await vu('stat-en-cours-nombre');
  await cap('01-accueil');
  await id('onglet-colis').click(); await vu('colis-liste'); await cap('02-colis');
  // Le premier colis de la liste : son parcours
  await id('colis-GSE-1002-HT').first().click();
  await vu('detail-statut'); await cap('03-detail');
  await page.goBack(); await attendre(500);
  await id('onglet-prealerte').click(); await vu('pa-magasin');
  await id('pa-magasin').fill('Amazon'); await id('pa-contenu').fill('Sony WH-1000XM5');
  await id('pa-suivi').fill('TBA3062290118'); await id('pa-valeur').fill('299');
  await page.keyboard.press('Escape').catch(() => {}); await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await cap('04-prealerte');
  await id('onglet-factures').click(); await attendre(1500); await cap('05-factures');
  await id('onglet-compte').click(); await vu('compte-historicite');
  await id('compte-historicite').click(); await vu('historicite-liste'); await cap('06-historicite');
  console.log(l, 'erreurs :', erreurs.length ? erreurs : 'aucune');
  await ctx.close();
}
await nav.close(); serveur.close();
