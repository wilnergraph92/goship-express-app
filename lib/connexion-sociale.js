// Se connecter avec un compte d'ailleurs (Google aujourd'hui) : ce qui ne dépend ni de
// React ni du téléphone, pour que « npm run essai » le vérifie tel quel. La connexion
// elle-même (navigateur du téléphone, session) est dans lib/session.js.

// Un fournisseur de plus : son nom ici, activé dans Supabase > Authentication >
// Providers, et son bouton dans app/connexion.jsx et app/inscription.jsx.
export const FOURNISSEURS = ['google'];

// Les fournisseurs que Supabase a vraiment activés, d'après ses réglages publics.
// Injoignable ou réponse inattendue : aucun. Le bouton reste alors caché — mieux vaut
// pas de bouton qu'un bouton qui mène à une page d'erreur de Supabase.
export async function fournisseursActifs(url, cle, recuperer = fetch) {
  try {
    const r = await recuperer(String(url || '').replace(/\/+$/, '') + '/auth/v1/settings', { headers: { apikey: cle } });
    if (!r || !r.ok) return [];
    const d = await r.json();
    const actifs = (d && d.external) || {};
    return FOURNISSEURS.filter((f) => actifs[f] === true);
  } catch (e) {
    return [];
  }
}

// Les paramètres de l'adresse par laquelle le fournisseur rend la main à l'application
// (goshipexpress://connexion?…#…) : Supabase les met après « ? » (code, erreur) ou
// après « # » (jetons de session).
export function lireRetour(adresse) {
  const texte = String(adresse || '');
  const debut = texte.search(/[?#]/);
  const r = {};
  if (debut < 0) return r;
  texte.slice(debut + 1).split(/[?#&]/).forEach((morceau) => {
    if (!morceau) return;
    const egal = morceau.indexOf('=');
    const lire = (s) => { try { return decodeURIComponent(s.replace(/\+/g, ' ')); } catch (e) { return s; } };
    const cle = lire(egal < 0 ? morceau : morceau.slice(0, egal));
    if (!(cle in r)) r[cle] = egal < 0 ? '' : lire(morceau.slice(egal + 1));
  });
  return r;
}

// Ce que l'application fait de ce retour : ouvrir la session (code à échanger, ou
// jetons), ou dire pourquoi elle ne s'ouvre pas.
export function issueRetour(p) {
  if (p.error) return { erreur: p.error === 'access_denied' ? 'connexion-annulee' : 'connexion-echec' };
  if (p.code) return { code: p.code };
  if (p.access_token && p.refresh_token) return { jetons: { access_token: p.access_token, refresh_token: p.refresh_token } };
  return { erreur: 'connexion-echec' };
}

// Un compte ouvert avec Google n'a ni pays, ni ville, ni téléphone : Google ne les
// donne pas. Il faut les demander (« Compléter mon profil »).
export function profilIncomplet(p) {
  if (!p) return false;
  const vide = (v) => !String(v || '').trim();
  return vide(p.nom_complet) || vide(p.pays) || vide(p.ville) || vide(p.telephone);
}
