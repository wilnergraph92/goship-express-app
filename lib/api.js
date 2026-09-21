// Accès aux données : colis, pré-alertes, factures, profil.
// Les règles de sécurité de Supabase font qu'un client ne voit que ses propres lignes.

import { supabase } from './supabase';

const CHAMPS_COLIS =
  'id, numero, suivi_transporteur, expediteur, description, poids_lb, service, pays_destination, ' +
  'destination, statut, lieu, note, recu_le, cree_le, maj_le, colis_historique(statut, lieu, note, cree_le)';

function resultat({ data, error }) {
  if (error) throw error;
  return data;
}

function trierHistorique(colis) {
  const h = Array.isArray(colis.colis_historique) ? colis.colis_historique.slice() : [];
  h.sort((a, b) => new Date(b.cree_le) - new Date(a.cree_le));
  return { ...colis, historique: h };
}

export async function monProfil(id) {
  return supabase.from('clients').select('*').eq('id', id).maybeSingle().then(resultat);
}

export async function majProfil(id, champs) {
  const permis = ['nom_complet', 'pays', 'region', 'ville', 'adresse', 'telephone', 'langue'];
  const propre = {};
  permis.forEach((c) => { if (champs[c] !== undefined) propre[c] = champs[c]; });
  return supabase.from('clients').update(propre).eq('id', id).select().single().then(resultat);
}

export async function mesColis() {
  const lignes = await supabase
    .from('colis')
    .select(CHAMPS_COLIS)
    .order('maj_le', { ascending: false })
    .then(resultat);
  return (lignes || []).map(trierHistorique);
}

export async function unColis(id) {
  const ligne = await supabase.from('colis').select(CHAMPS_COLIS).eq('id', id).maybeSingle().then(resultat);
  return ligne ? trierHistorique(ligne) : null;
}

// Mises à jour en direct : dès que le tableau de bord change un colis, l'écran se rafraîchit.
export function surveillerColis(idClient, rappel) {
  const canal = supabase
    .channel('colis-app-' + idClient)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'colis', filter: 'client_id=eq.' + idClient }, rappel)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'colis_historique' }, rappel)
    .subscribe();
  return () => { supabase.removeChannel(canal); };
}

export async function mesPrealertes() {
  return supabase
    .from('prealertes')
    .select('id, magasin, description, suivi_transporteur, valeur_usd, service, statut, cree_le')
    .order('cree_le', { ascending: false })
    .then(resultat);
}

export async function creerPrealerte(champs) {
  return supabase.from('prealertes').insert(champs).select().single().then(resultat);
}

export async function supprimerPrealerte(id) {
  return supabase.from('prealertes').delete().eq('id', id).then(resultat);
}

export async function mesFactures() {
  return supabase
    .from('factures')
    .select('id, numero, montant_usd, statut, note, lien_paiement, echeance_le, cree_le, payee_le, facture_lignes(libelle, montant_usd)')
    .order('cree_le', { ascending: false })
    .then(resultat);
}

// Jeton de notification du téléphone, pour que l'admin puisse prévenir ce client.
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
