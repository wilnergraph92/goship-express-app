// La date de naissance saisie en trois cases (jour, mois, année) : le jour civil
// « AAAA-MM-JJ » que la base attend, sans jamais passer par le fuseau de l'appareil.
//
// Pas de sélecteur natif : il demanderait une bibliothèque native de plus, donc une nouvelle
// version à publier sur les boutiques. Trois cases numériques marchent partout. Ces
// vérifications devancent la base (valider_date_naissance, supabase-naissance.sql) ; c'est
// elle qui décide, et ses codes sont ceux que lib/erreurs.js sait lire.

// Le jour d'aujourd'hui sur l'appareil, écrit à la main (toISOString() donnerait celui d'UTC)
export function aujourdhuiLocal(maintenant = new Date()) {
  const d = (n) => String(n).padStart(2, '0');
  return `${maintenant.getFullYear()}-${d(maintenant.getMonth() + 1)}-${d(maintenant.getDate())}`;
}

// { jour, mois, annee } en texte → { valide, code, iso }
//   code : 'vide' (rien saisi) | 'incomplet' | 'invalide' (n'existe pas, avant 1900) | 'futur'
export function lireNaissance({ jour = '', mois = '', annee = '' } = {}, aujourdhui = aujourdhuiLocal()) {
  const j = String(jour).trim(), m = String(mois).trim(), a = String(annee).trim();
  if (!j && !m && !a) return { valide: false, code: 'vide', iso: null };
  if (!/^\d{1,2}$/.test(j) || !/^\d{1,2}$/.test(m) || !/^\d{4}$/.test(a)) return { valide: false, code: 'incomplet', iso: null };
  const jn = Number(j), mn = Number(m), an = Number(a);
  const u = new Date(Date.UTC(an, mn - 1, jn));
  if (an < 1900 || u.getUTCFullYear() !== an || u.getUTCMonth() !== mn - 1 || u.getUTCDate() !== jn) {
    return { valide: false, code: 'invalide', iso: null };
  }
  const iso = `${a}-${String(mn).padStart(2, '0')}-${String(jn).padStart(2, '0')}`;
  if (iso > aujourdhui) return { valide: false, code: 'futur', iso };
  return { valide: true, code: null, iso };
}

// La clé du message de chaque refus de la date, avant même d'appeler la base (qui refait le contrôle)
export const MESSAGE_NAISSANCE = { vide: 'nz.requise', incomplet: 'nz.incomplete', invalide: 'nz.invalide', futur: 'nz.futur' };

// « 1990-03-15 » → « 15 mars 1990 » dans la langue de l'application (sans décalage de jour)
const MOIS = {
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  ht: ['janvye', 'fevriye', 'mas', 'avril', 'me', 'jen', 'jiyè', 'out', 'septanm', 'oktòb', 'novanm', 'desanm'],
};

export function jourCivil(iso, langue = 'fr') {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!m) return '';
  const mois = (MOIS[langue] || MOIS.fr)[Number(m[2]) - 1];
  const j = Number(m[3]);
  if (langue === 'en') return `${mois} ${j}, ${m[1]}`;
  if (langue === 'es') return `${j} de ${mois} de ${m[1]}`;
  return `${j} ${mois} ${m[1]}`;
}
