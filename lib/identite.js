// Sexe et document d'identité demandés à l'inscription, comme sur le site.
//
// Ces vérifications devancent la base (lire_sexe, lire_type_document et lire_numero_document,
// outils/supabase-identite.sql) : c'est elle qui décide, et elle ignore sans refuser tout ce
// qu'elle ne comprend pas. Seul le TYPE (passeport, cedula) et le numéro sont envoyés.

export const SEXES = ['M', 'F'];
export const DOCUMENTS = ['passeport', 'cedula'];

// Le numéro tel que la base le range : sans espaces, points ni tirets, en majuscules.
// Un passeport : lettres et chiffres, 5 à 20 signes. Une cédula : chiffres seulement, 6 à 15.
// Vide si le numéro est illisible pour ce document.
export function numeroDocument(type, texte) {
  const n = String(texte == null ? '' : texte).replace(/[\s.\-]/g, '').toUpperCase();
  if (type === 'passeport') return /^[A-Z0-9]{5,20}$/.test(n) ? n : '';
  if (type === 'cedula') return /^[0-9]{6,15}$/.test(n) ? n : '';
  return '';
}

// Le numéro de téléphone d'exemple de chaque pays, comme sur le site
export const TELEPHONE_EXEMPLE = { HT: '+509 3712 3456', DO: '+1 809 555 0147', US: '+1 305 555 0147' };

// Un nom et un prénom au moins, comme le formulaire du site
export function nomComplet(texte) {
  return String(texte || '').trim().split(/\s+/).filter(Boolean).length >= 2;
}

// Sept chiffres au moins, comme le formulaire du site
export function telephoneValide(texte) {
  return String(texte || '').replace(/\D/g, '').length >= 7;
}
