// Petites aides des écrans de programmes (GOPOINTS, bienvenue, parrainage). Rien n'est calculé
// ici qui relève de la base : on met en forme ce qu'elle a répondu.

// « 1 point » / « 150 points » : le mot est choisi par l'écran (traduit), jamais ici
export function pluriel(n) {
  return Math.abs(Number(n)) === 1 ? 'un' : 'n';
}

// Un code de parrainage saisi : majuscules, sans espaces, 24 signes au plus
export function normaliserCodeParrain(texte) {
  return String(texte || '').replace(/\s+/g, '').toUpperCase().slice(0, 24);
}

// Le code d'un lien d'invitation (« …/inscription.html?parrain=GSABC123 »), ou ''
export function codeDuLien(url) {
  const m = /[?&]parrain=([A-Za-z0-9]{4,24})/.exec(String(url || ''));
  return m ? m[1].toUpperCase() : '';
}

// Le message d'invitation : le modèle traduit avec {code} et {lien} remplacés. Sans lien (le site
// n'est pas configuré en base), le message ne garde que le code.
export function messageInvitation(modele, code, lien) {
  return String(modele || '').replace('{code}', code || '').replace('{lien}', lien || '').replace(/\s*:\s*$/, '').trim();
}
