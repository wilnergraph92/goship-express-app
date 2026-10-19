// L'adresse de réception en Floride d'un client : huit champs, dans l'ordre des formulaires
// des magasins (Amazon, SHEIN, Temu…), et le texte qu'on colle dedans.
//
// Aucune règle métier : les valeurs fixes viennent de config.js (adresseMiami), le nom et le
// code client du compte connecté. Sans l'un des deux, on ne compose pas d'adresse : un colis
// livré sous le nom d'un autre, ou sans code, ne serait pas reconnu à l'entrepôt.

// Le nom et le code du compte, ou null s'il en manque un
export function nomEtCode(profil) {
  const nom = String((profil && profil.nom_complet) || '').trim().replace(/\s+/g, ' ');
  const code = String((profil && profil.code) || '').trim();
  return nom && code ? `${nom} ${code}` : null;
}

// true si l'adresse peut être composée pour ce profil
export function adressePrete(profil) {
  return nomEtCode(profil) !== null;
}

// Les sept champs identiques pour tous les clients : { cle, libelle, valeur }. Les libellés
// sont ceux, anglais, des formulaires des magasins : on ne les traduit pas.
export function champsFixes(a) {
  return [
    { cle: 'address1', libelle: 'Address 1', valeur: a.ligne1 },
    { cle: 'address2', libelle: 'Address 2', valeur: a.ligne2 },
    { cle: 'city', libelle: 'City', valeur: a.ville },
    { cle: 'state', libelle: 'State', valeur: a.etat },
    { cle: 'zip', libelle: 'Zip Code', valeur: a.zip },
    { cle: 'country', libelle: 'Country', valeur: a.pays },
    { cle: 'phone', libelle: 'Phone', valeur: a.telephone },
  ];
}

// Les huit champs, le nom en tête. Null si le nom ou le code manque : pas d'adresse à composer.
export function champsAdresse(profil, a) {
  const nom = nomEtCode(profil);
  if (!nom) return null;
  return [{ cle: 'name', libelle: 'Name', valeur: nom }].concat(champsFixes(a));
}

// Le texte complet, une ligne par information : le nom, la rue, la référence, « ville, État
// code postal », le pays, le téléphone — comme le bouton « Copier l'adresse complète » du site.
export function adresseTexte(profil, a) {
  const c = champsAdresse(profil, a);
  if (!c) return '';
  const v = Object.fromEntries(c.map((x) => [x.cle, x.valeur]));
  return [v.name, v.address1, v.address2, `${v.city}, ${v.state} ${v.zip}`, v.country, v.phone].filter(Boolean).join('\n');
}
