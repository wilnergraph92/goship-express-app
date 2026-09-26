// Vérifications d'un formulaire AVANT l'envoi, pour répondre tout de suite.
//
// Elles ne font que devancer la base : c'est elle qui décide (creer_prealerte refuse
// les mêmes cas avec les mêmes codes). Rien ici ne remplace une règle du serveur.

// Nombre saisi au clavier (« 12,50 », « 12.5 ») → nombre, null si vide, NaN si illisible
export function lireNombre(texte) {
  const t = String(texte == null ? '' : texte).trim().replace(/\s/g, '').replace(',', '.');
  if (t === '') return null;
  if (!/^\d+(\.\d{0,2})?$/.test(t)) return NaN;
  return Number(t);
}

// Même mise en forme que la base : majuscules, sans espaces
export function normaliserSuivi(texte) {
  return String(texte || '').toUpperCase().replace(/\s/g, '');
}

// → { valide, erreurs: { champ: code } , propre: champs à envoyer }
export function verifierPrealerte(champs) {
  const erreurs = {};
  const magasin = String(champs.magasin || '').trim();
  const description = String(champs.description || '').trim();
  const suivi = normaliserSuivi(champs.suivi);
  const valeur = lireNombre(champs.valeur);
  const service = champs.service || 'aerien';

  if (!magasin) erreurs.magasin = 'PREALERT_STORE_REQUIRED';
  else if (magasin.length > 80) erreurs.magasin = 'TROP_LONG';
  if (!description) erreurs.description = 'PREALERT_DESCRIPTION_REQUIRED';
  else if (description.length > 300) erreurs.description = 'TROP_LONG';
  if (suivi && !/^[A-Z0-9-]{6,60}$/.test(suivi)) erreurs.suivi = 'INVALID_TRACKING';
  if (Number.isNaN(valeur) || (valeur !== null && (valeur < 0 || valeur > 100000))) erreurs.valeur = 'INVALID_VALUE';
  if (['aerien', 'maritime'].indexOf(service) < 0) erreurs.service = 'INVALID_SERVICE';

  return {
    valide: Object.keys(erreurs).length === 0,
    erreurs,
    propre: { magasin, description, suivi_transporteur: suivi, valeur_usd: Number.isNaN(valeur) ? null : valeur, service },
  };
}
