// Accès aux données : colis, étapes, pré-alertes, factures, paiements, profil.
//
// L'application n'a aucune logique métier à elle : elle lit et écrit par les mêmes
// tables et les mêmes fonctions de la base que l'espace client du site
// (assets/js/api.js du dépôt Goship-express-site). Les règles de sécurité de Supabase
// font qu'un client ne voit que ses propres lignes ; l'application filtre en plus sur
// son propre compte (client_id), pour qu'un compte de l'équipe n'y voie que ses colis
// à lui et jamais toute la base.
//
// Chaque fonction rend les données, ou lance une erreur déjà classée (lib/erreurs.js).
// Les lectures passent en GET : supabase-js les réessaie seul, un nombre limité de
// fois, sur une coupure ou un serveur momentanément indisponible. Une écriture n'est
// jamais répétée automatiquement.

import { supabase } from './supabase';
import { erreurGoship } from './erreurs';

export const PAR_PAGE = 20;

// Mêmes colonnes que l'espace client du site. Les étapes ne sont chargées qu'à
// l'ouverture d'un colis, pas pour toute la liste.
const CHAMPS_LISTE =
  'id, numero, suivi_transporteur, expediteur, description, poids_lb, service, pays_destination, ' +
  'destination, statut, lieu, note, recu_le, cree_le, maj_le';
const CHAMPS_DETAIL = CHAMPS_LISTE + ', colis_historique(id, type_evenement, statut, lieu, note, cree_le)';

// Les filtres de « Mes colis » : des statuts officiels, jamais d'autres
export const FILTRES = {
  tous: null,
  route: ['recu', 'emballe', 'embarque', 'distribution', 'succursale'],
  retirer: ['disponible'],
  livres: ['livre'],
  action: ['incident'],
};

// supabase-js ne met pas le code HTTP dans l'erreur : on l'y ajoute, pour distinguer
// une panne du serveur (503) d'un refus (401, 403)
function resultat({ data, error, status }) {
  if (error) throw erreurGoship({ ...error, status: error.status || status });
  return data;
}

async function moi() {
  const { data } = await supabase.auth.getSession();
  const id = data && data.session && data.session.user ? data.session.user.id : null;
  if (!id) throw erreurGoship({ code: 'PGRST301', message: 'JWT expired' });
  return id;
}

// Les étapes dans l'ordre où elles ont été enregistrées (l'identifiant fait foi,
// comme sur le site)
export function trierHistorique(colis) {
  const h = Array.isArray(colis.colis_historique) ? colis.colis_historique.slice() : [];
  h.sort((a, b) => (a.id != null && b.id != null ? a.id - b.id : new Date(a.cree_le) - new Date(b.cree_le)));
  const copie = { ...colis, historique: h };
  delete copie.colis_historique;
  return copie;
}

// Ce qu'on peut chercher sans casser la syntaxe du filtre de PostgREST
export function nettoyerRecherche(texte) {
  return String(texte || '').replace(/[^0-9A-Za-zÀ-ÖØ-öø-ÿ' -]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
}

/* ---- Profil et permissions ---------------------------------------------------- */

export async function monProfil(id) {
  return supabase.from('clients').select('*').eq('id', id).maybeSingle().then(resultat);
}

export async function majProfil(id, champs) {
  const permis = ['nom_complet', 'pays', 'region', 'ville', 'adresse', 'telephone', 'langue'];
  const propre = {};
  permis.forEach((c) => { if (champs[c] !== undefined) propre[c] = champs[c]; });
  return supabase.from('clients').update(propre).eq('id', id).select().single().then(resultat);
}

// { role, equipe, permissions } lus dans la base (Phase 6). Ne sert qu'à l'affichage :
// chaque lecture et chaque action restent vérifiées par la base.
export async function mesPermissions() {
  return supabase.rpc('mes_permissions', {}, { get: true }).then(resultat);
}

/* ---- Colis --------------------------------------------------------------------- */

// Une page de « Mes colis », filtrée et cherchée par la base : l'application ne charge
// jamais tous les colis pour chercher dedans.
export async function mesColis({ page = 0, parPage = PAR_PAGE, filtre = 'tous', recherche = '' } = {}) {
  const id = await moi();
  let q = supabase
    .from('colis')
    .select(CHAMPS_LISTE, { count: page === 0 ? 'exact' : undefined })
    .eq('client_id', id);
  const statuts = FILTRES[filtre];
  if (statuts) q = q.in('statut', statuts);
  const cherche = nettoyerRecherche(recherche);
  if (cherche) {
    const motif = `"*${cherche}*"`;
    q = q.or(['numero', 'description', 'expediteur', 'suivi_transporteur', 'destination']
      .map((c) => `${c}.ilike.${motif}`).join(','));
  }
  const debut = page * parPage;
  const { data, error, count, status } = await q
    .order('maj_le', { ascending: false })
    .order('id', { ascending: false })
    .range(debut, debut + parPage - 1);
  if (error) throw erreurGoship({ ...error, status });
  return { lignes: data || [], total: count == null ? null : count, suite: (data || []).length === parPage };
}

export async function unColis(idColis) {
  const id = await moi();
  const ligne = await supabase.from('colis').select(CHAMPS_DETAIL)
    .eq('id', idColis).eq('client_id', id).maybeSingle().then(resultat);
  return ligne ? trierHistorique(ligne) : null;
}

// Un de MES colis, par son numéro Goship (étiquette) ou le suivi du vendeur
export async function trouverMonColis(reference) {
  const id = await moi();
  const r = String(reference || '').toUpperCase().replace(/[^0-9A-Z-]/g, '');
  if (r.length < 4) return null;
  const lignes = await supabase.from('colis').select('id, numero')
    .eq('client_id', id).or(`numero.eq.${r},suivi_transporteur.eq.${r}`)
    .order('maj_le', { ascending: false }).limit(1).then(resultat);
  return (lignes && lignes[0]) || null;
}

// Le suivi public, le même moteur que le formulaire « Où est mon colis ? » du site :
// statut et étapes publiques seulement, sans nom, description ni note.
export async function suivreColis(numero) {
  const d = await supabase.rpc('suivre_colis', { p_numero: String(numero || '').trim() }, { get: true }).then(resultat);
  if (!d) return null;
  const h = Array.isArray(d.historique) ? d.historique : [];
  return { ...d, historique: h };
}

// Mises à jour en direct : dès que l'équipe change un colis, une facture ou rapproche
// une pré-alerte, l'écran se rafraîchit. Les règles de sécurité s'appliquent aussi ici.
let numeroCanal = 0;
export function surveiller(idClient, rappel) {
  if (!idClient) return () => {};
  numeroCanal += 1;
  const filtre = 'client_id=eq.' + idClient;
  const canal = supabase
    .channel('app-' + idClient + '-' + numeroCanal)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'colis', filter: filtre }, () => rappel('colis'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'factures', filter: filtre }, () => rappel('factures'))
    .subscribe();
  return () => { supabase.removeChannel(canal); };
}

/* ---- Résumé (accueil) ---------------------------------------------------------- */

// Le résumé de l'espace client, compté par la base (mon_resume) : colis par état,
// factures (facturé, payé, solde, en retard) et derniers messages envoyés.
export async function monResume() {
  return supabase.rpc('mon_resume', {}, { get: true }).then(resultat);
}

/* ---- Pré-alertes ----------------------------------------------------------------- */

export async function mesPrealertes({ page = 0, parPage = PAR_PAGE } = {}) {
  const id = await moi();
  const debut = page * parPage;
  const lignes = await supabase
    .from('prealertes')
    .select('id, magasin, description, suivi_transporteur, valeur_usd, service, statut, cree_le')
    .eq('client_id', id)
    .order('cree_le', { ascending: false })
    .range(debut, debut + parPage - 1)
    .then(resultat);
  return { lignes: lignes || [], suite: (lignes || []).length === parPage };
}

// Une clé par envoi : si la même requête part deux fois (double appui, réseau lent,
// nouvel essai après un délai dépassé), la base ne crée qu'une pré-alerte.
export function nouvelleCle() {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  const octets = new Uint8Array(16);
  if (c && typeof c.getRandomValues === 'function') c.getRandomValues(octets);
  else for (let i = 0; i < 16; i += 1) octets[i] = Math.floor(Math.random() * 256);
  octets[6] = (octets[6] & 0x0f) | 0x40;
  octets[8] = (octets[8] & 0x3f) | 0x80;
  const h = Array.from(octets, (o) => o.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// La base valide, refuse les doublons et rend la pré-alerte enregistrée
// (outils/supabase-mobile.sql, creer_prealerte). Tant que cette fonction n'est pas
// installée, l'ancien chemin (insert direct) sert encore, sans ces garanties.
export async function creerPrealerte(champs, cle) {
  const { data, error } = await supabase.rpc('creer_prealerte', {
    p_cle: cle,
    p_magasin: champs.magasin,
    p_description: champs.description,
    p_suivi: champs.suivi_transporteur || '',
    p_valeur: champs.valeur_usd === undefined ? null : champs.valeur_usd,
    p_service: champs.service || 'aerien',
  });
  if (!error) return data;
  if (error.code !== 'PGRST202') throw erreurGoship(error);
  // La base n'a pas encore supabase-mobile.sql : l'ancien chemin, sans ses garanties
  const id = await moi();
  return supabase.from('prealertes').insert({
    client_id: id,
    magasin: champs.magasin,
    description: champs.description,
    suivi_transporteur: champs.suivi_transporteur || '',
    valeur_usd: champs.valeur_usd === undefined ? null : champs.valeur_usd,
    service: champs.service || 'aerien',
  }).select().single().then(resultat);
}

export async function supprimerPrealerte(idPrealerte) {
  const id = await moi();
  const lignes = await supabase.from('prealertes').delete()
    .eq('id', idPrealerte).eq('client_id', id).select('id').then(resultat);
  // Aucune ligne : elle n'était pas (ou plus) à ce compte
  if (!lignes || lignes.length === 0) throw erreurGoship({ code: 'PGRST116', status: 404 });
  return true;
}

/* ---- Factures et paiements ------------------------------------------------------- */

// Les factures du compte, avec leurs lignes, leurs paiements reçus, le payé, le
// solde et l'état — tous calculés par la base (mes_factures, Phase 5). L'application
// ne fait aucune addition : elle affiche ces valeurs telles quelles.
export async function mesFactures() {
  const lignes = await supabase.rpc('mes_factures', {}, { get: true }).then(resultat);
  return Array.isArray(lignes) ? lignes : [];
}

export function factureOuverte(f) {
  return f && f.statut !== 'annulee' && Number(f.solde_usd) > 0;
}

/* ---- Téléphone (notifications) ---------------------------------------------------- */

// Jeton de notification du téléphone, pour que la base puisse prévenir ce client.
// La base s'en charge elle-même : elle vérifie le jeton et rattache le téléphone
// au client connecté (un téléphone changé de main n'envoie plus les colis de
// l'ancien propriétaire).
export async function enregistrerAppareil(jeton, plateforme, langue) {
  return supabase
    .rpc('enregistrer_appareil', { p_jeton: jeton, p_plateforme: plateforme, p_langue: langue })
    .then(resultat);
}

export async function oublierAppareil(jeton) {
  if (!jeton) return null;
  return supabase.from('appareils').delete().eq('jeton', jeton).then(resultat);
}

/* ---- Supprimer mon compte ------------------------------------------------------------ */

// La base fait tout, dans une seule transaction, et seulement pour le compte connecté
// (supprimer_mon_compte, outils/supabase-compte.sql du dépôt du site) : profil vidé,
// connexion bloquée, sessions fermées, téléphones et pré-alertes en attente effacés.
// Colis, factures et paiements restent, sans les coordonnées. Elle refuse tant qu'un
// colis n'est pas livré ou qu'une facture reste à payer, avec la phrase à montrer.
// Le mot SUPPRIMER est la confirmation : un appel parti par erreur ne fait rien.
export async function supprimerMonCompte() {
  const { data, error } = await supabase.rpc('supprimer_mon_compte', { p_confirmation: 'SUPPRIMER' });
  if (!error) return data;
  // Une base qui n'a pas encore reçu la migration : le dire, sans rien tenter d'autre
  if (error.code === 'PGRST202') {
    throw erreurGoship({ message: 'ACCOUNT_DELETION_UNAVAILABLE', hint: 'goship', details: '' });
  }
  throw erreurGoship(error);
}
