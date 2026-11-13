// Mes colis en route : lire la réponse de la base (mes_suivis_externes, la même lecture que
// l'espace client du site) pour l'afficher. Rien ne se décide ici : le statut, le message,
// les dates et la chronologie viennent de la base, qui ne montre rien d'un fournisseur pas
// encore vérifié. Ce fichier ne fait que traduire des codes en phrases, classer une carte
// pour son badge et ses filtres, et reconnaître un numéro de commande. Aucun import : les
// essais de logique (essais/essai-logique.mjs) le chargent tel quel.
//
// Le client ne voit jamais un code ; et « livré » par le transporteur n'est jamais « reçu » :
// seul le scan de l'entrepôt GoShip le dit.

// Les douze statuts normalisés de la base (suivis_externes.statut)
export const STATUTS_TRANSPORTEUR = ['PENDING', 'INFO_RECEIVED', 'IN_TRANSIT', 'CUSTOMS', 'OUT_FOR_DELIVERY',
  'AVAILABLE_FOR_PICKUP', 'DELIVERED', 'FAILED_ATTEMPT', 'EXCEPTION', 'RETURNED', 'EXPIRED', 'NOT_FOUND'];

// Les codes de la base qui demandent au client de vérifier son numéro (badge « À vérifier »)
export const A_VERIFIER = ['ORDER_NUMBER_DETECTED', 'INVALID_TRACKING', 'CARRIER_UNKNOWN'];
const INCIDENTS = ['FAILED_ATTEMPT', 'EXCEPTION', 'RETURNED'];

// L'état d'une carte, pour son badge et le filtre :
//   attente  en route (ou pas encore de nouvelles)
//   livre    livré par le transporteur, pas encore reçu à l'entrepôt
//   recu     arrivé à Miami : c'est un colis GoShip
//   info     à vérifier (numéro refusé, numéro de commande…) ou incident chez le transporteur
export function etatAchat(achat) {
  const a = achat || {};
  if (a.statut === 'recu') return 'recu';
  const s = a.suivi;
  if (A_VERIFIER.indexOf(a.message) >= 0 || (s && INCIDENTS.indexOf(s.statut) >= 0)) return 'info';
  if (s && s.statut === 'DELIVERED') return 'livre';
  return 'attente';
}

// La phrase du statut du transporteur. t : la fonction de traduction (clé, remplacements).
export function phraseStatut(suivi, t) {
  const s = suivi || {};
  if (!s.statut) return t('er.statut.PENDING');
  if (s.statut === 'DELIVERED' && s.transporteur_nom) return t('er.statut.DELIVERED_par', { transporteur: s.transporteur_nom });
  return STATUTS_TRANSPORTEUR.indexOf(s.statut) >= 0 ? t('er.statut.' + s.statut) : t('er.statut.inconnu');
}

// Le nom d'un achat, tel que le client l'a saisi : « SHEIN — Robe »
export function titreAchat(achat) {
  const a = achat || {};
  return [a.magasin, a.description].map((x) => String(x || '').trim()).filter(Boolean).join(' — ');
}

// Filtrer et chercher, sur le téléphone, dans les cent cartes au plus que rend la base
export function filtrerAchats(achats, filtre = 'tous', recherche = '') {
  const q = sansAccents(String(recherche || '').trim().toLowerCase());
  return (achats || []).filter((a) => {
    if (filtre && filtre !== 'tous' && etatAchat(a) !== filtre) return false;
    if (!q) return true;
    const texte = [a.magasin, a.description, a.numero_suivi, a.colis && a.colis.numero,
      a.suivi && a.suivi.transporteur_nom].filter(Boolean).join(' ').toLowerCase();
    // Tel quel, puis sans espaces ni ponctuation : « tba 312 », « robe d ete » trouvent « TBA312 », « Robe d'été »
    const compact = (x) => x.replace(/[^a-z0-9]+/g, '');
    return sansAccents(texte).indexOf(q) >= 0 || (compact(q) !== '' && compact(sansAccents(texte)).indexOf(compact(q)) >= 0);
  });
}

// Combien de cartes par état, pour les filtres
export function compterAchats(achats) {
  const n = { tous: 0, attente: 0, livre: 0, recu: 0, info: 0 };
  (achats || []).forEach((a) => { n.tous += 1; n[etatAchat(a)] += 1; });
  return n;
}

// Un numéro de commande Amazon (comme nature_numero dans la base) ou de colis GoShip : ni
// l'un ni l'autre ne se suit chez un transporteur
export function natureNumero(texte) {
  const n = String(texte || '').toUpperCase().replace(/\s+/g, '');
  if (/^[0-9]{3}-[0-9]{7}-[0-9]{7}$/.test(n)) return 'commande';
  if (/^GSE-?[0-9]+(-[A-Z]{2})?$/.test(n)) return 'goship';
  return '';
}

// Un numéro qui a la forme d'un suivi de transporteur (lettres et au moins six chiffres,
// sans le préfixe GSE) : la même règle que la page publique du site
export function ressembleSuiviTransporteur(texte) {
  const n = String(texte || '').toUpperCase().replace(/\s+/g, '');
  return !/^GSE/.test(n) && /^[A-Z0-9-]{8,40}$/.test(n) && (n.match(/\d/g) || []).length >= 6;
}

// « Mis à jour il y a 12 min », « il y a 3 h » ; au-delà d'un jour : null (l'écran écrit la date)
export function depuis(iso, t, maintenant = Date.now()) {
  if (!iso) return '';
  const quand = new Date(iso).getTime();
  if (Number.isNaN(quand)) return '';
  const minutes = Math.max(1, Math.round((maintenant - quand) / 60000));
  if (minutes < 60) return t('er.maj_minutes', { n: minutes });
  if (minutes < 24 * 60) return t('er.maj_heures', { n: Math.round(minutes / 60) });
  return null;
}

// Une date seule (« 2026-11-14 ») lue à midi, heure du téléphone : lue à minuit UTC, elle
// s'afficherait la veille en Haïti et en République dominicaine
export function dateSeule(texte) {
  const s = String(texte || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s + 'T12:00:00' : '';
}

function sansAccents(texte) {
  return String(texte).normalize('NFD').replace(/[̀-ͯ]/g, '');
}
