// ==========================================================================
//  Images finales de la fiche Google Play
// ==========================================================================
//  Habille chaque capture brute (captures.mjs) d'un titre et d'un cadre de téléphone,
//  en 1080×1920, et dessine la bannière (« feature graphic ») en 1024×500. Polices et
//  couleurs de l'application (Archivo, Manrope, nuit #061a3f, orange #f4600d).
//
//    BRUT=dossier-des-captures CHROMIUM=/chemin/chrome node boutique/outils/composer.mjs
// ==========================================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(RACINE, 'boutique', 'play', 'images');
const BRUT = process.env.BRUT || path.join(RACINE, 'boutique', 'play', 'brut');
// Un dossier de travail : la page, les polices, le logo et les captures côte à côte
const D = fs.mkdtempSync(path.join(os.tmpdir(), 'goship-play-'));
const POLICES = path.join(RACINE, 'node_modules', '@expo-google-fonts');
fs.copyFileSync(path.join(POLICES, 'archivo', '800ExtraBold', 'Archivo_800ExtraBold.ttf'), path.join(D, 'archivo.ttf'));
fs.copyFileSync(path.join(POLICES, 'manrope', '700Bold', 'Manrope_700Bold.ttf'), path.join(D, 'manrope.ttf'));
for (const f of ['logo-goship-blanc.png', 'icon.png']) fs.copyFileSync(path.join(RACINE, 'assets', f), path.join(D, f));
for (const f of fs.readdirSync(BRUT)) if (f.endsWith('.png')) fs.copyFileSync(path.join(BRUT, f), path.join(D, f));
const TITRES = {
  fr: ['Votre adresse à Miami, toujours dans votre poche', 'Suivez chaque colis, de Miami jusqu’à chez vous', 'Chaque étape, avec la date et l’heure', 'Annoncez vos achats en quelques secondes', 'Vos factures et votre solde, en clair', 'Tous vos colis livrés, retrouvés en un instant'],
  en: ['Your Miami address, always in your pocket', 'Track every package from Miami to your door', 'Every step, with date and time', 'Pre-alert your purchases in seconds', 'Your invoices and balance, at a glance', 'All your delivered packages, found in a flash'],
  es: ['Su dirección en Miami, siempre en su bolsillo', 'Siga cada paquete, de Miami hasta su casa', 'Cada etapa, con fecha y hora', 'Anuncie sus compras en segundos', 'Sus facturas y su saldo, claros', 'Todos sus paquetes entregados, al instante'],
};
const NOMS = ['01-accueil', '02-colis', '03-detail', '04-prealerte', '05-factures', '06-historicite'];
const css = `@font-face{font-family:A;src:url(archivo.ttf)}@font-face{font-family:M;src:url(manrope.ttf)}
*{margin:0;box-sizing:border-box}body{width:1080px;height:1920px;overflow:hidden;background:#061a3f;font-family:M;position:relative}
.rond{position:absolute;border-radius:50%;background:rgba(244,96,13,.16)}
.haut{position:absolute;left:84px;right:84px;top:92px}
.logo{height:62px;display:block;margin-bottom:34px}
h1{font-family:A;color:#fff;font-size:68px;line-height:1.08;letter-spacing:-.5px}
h1 b{color:#ff7a2e;font-weight:inherit}
.tel{position:absolute;left:50%;transform:translateX(-50%);bottom:-40px;width:760px;height:1520px;border-radius:64px;background:#0b1530;padding:16px;
box-shadow:0 40px 90px -30px rgba(0,0,0,.65),0 0 0 3px rgba(255,255,255,.08)}
.tel img{width:100%;height:100%;border-radius:50px;display:block;object-fit:cover;object-position:top}`;
const nav = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const page = await nav.newPage({ viewport: { width: 1080, height: 1920 } });
for (const [l, titres] of Object.entries(TITRES)) {
  for (let i = 0; i < NOMS.length; i++) {
    // Le dernier mot du titre en orange, comme sur le site
    const t = titres[i].replace(/(\S+)$/, '<b>$1</b>');
    const html = `<!doctype html><meta charset=utf-8><style>${css}</style>
<div class=rond style="width:900px;height:900px;right:-420px;top:-380px"></div>
<div class=rond style="width:520px;height:520px;left:-300px;top:820px;background:rgba(37,99,235,.14)"></div>
<div class=haut><img class=logo src="logo-goship-blanc.png"><h1>${t}</h1></div>
<div class=tel><img src="${l}-${NOMS[i]}.png"></div>`;
    fs.writeFileSync(D + '/page.html', html);
    await page.goto('file://' + D + '/page.html'); await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/telephone-${l}-${NOMS[i]}.png` });
  }
}
// Bannière 1024×500
await page.setViewportSize({ width: 1024, height: 500 });
const BANNIERES = { fr: ['Vos achats aux USA,', 'livrés en Haïti et à Santo Domingo'], en: ['Shop in the USA,', 'delivered to Haiti and Santo Domingo'], es: ['Compre en EE. UU.,', 'reciba en Haití y Santo Domingo'] };
for (const [l, [a, b]] of Object.entries(BANNIERES)) {
  fs.writeFileSync(D + '/page.html', `<!doctype html><meta charset=utf-8><style>@font-face{font-family:A;src:url(archivo.ttf)}@font-face{font-family:M;src:url(manrope.ttf)}
*{margin:0;box-sizing:border-box}body{width:1024px;height:500px;overflow:hidden;background:#061a3f;position:relative;font-family:M}
.rond{position:absolute;border-radius:50%}
.g{position:absolute;left:72px;top:0;bottom:0;width:560px;display:flex;flex-direction:column;justify-content:center}
.logo{height:58px;width:auto;align-self:flex-start;margin-bottom:30px}
h1{font-family:A;color:#fff;font-size:41px;line-height:1.12}h1 b{color:#ff7a2e;font-weight:inherit;display:block}
p{color:#a9b8da;font-size:22px;margin-top:20px}
.ic{position:absolute;right:70px;top:50%;transform:translateY(-50%);width:300px;height:300px;border-radius:68px;background:#fff;
box-shadow:0 30px 70px -20px rgba(0,0,0,.6);display:grid;place-items:center;overflow:hidden}.ic img{width:250px;border-radius:40px}
</style><div class=rond style="width:620px;height:620px;right:-170px;top:-60px;background:rgba(244,96,13,.18)"></div>
<div class=rond style="width:300px;height:300px;left:-120px;bottom:-160px;background:rgba(37,99,235,.16)"></div>
<div class=g><img class=logo src="logo-goship-blanc.png"><h1>${a}<b>${b}</b></h1><p>${l === 'fr' ? 'Miami · Port-au-Prince · Santo Domingo' : l === 'en' ? 'Miami · Port-au-Prince · Santo Domingo' : 'Miami · Puerto Príncipe · Santo Domingo'}</p></div>
<div class=ic><img src="icon.png"></div>`);
  await page.goto('file://' + D + '/page.html'); await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/banniere-${l}.png` });
}
await nav.close();
