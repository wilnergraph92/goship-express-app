// Réglages de l'application GoShip Express.
//
// La clé « publiable » est prévue pour être lue par les clients : elle ne donne accès
// qu'à ce que les règles de sécurité de Supabase autorisent (comme sur le site).
// Aucun autre secret ne doit jamais apparaître ici : ni clé « service_role », ni mot de
// passe, ni clé d'un service de paiement, d'e-mail ou de WhatsApp. Tout ce fichier part
// dans l'application publiée, lisible par n'importe qui.
//
// Environnements (choisis au moment de construire l'application, jamais par l'utilisateur) :
//   production  la vraie base — par défaut, et dans tout build des boutiques (eas.json)
//   staging     la préproduction (projet Supabase goship-staging, profil EAS « staging ») :
//               adresse et clé publiable dans EXPO_PUBLIC_SUPABASE_URL et
//               EXPO_PUBLIC_SUPABASE_CLE, fixées au moment du build. Jamais l'adresse de
//               la production (refusée ici, et par essais/controle-paquet.mjs).
//   essai       une base jetable sur la machine d'essai (essais automatiques seulement) :
//               son adresse vient de EXPO_PUBLIC_SUPABASE_URL, fixée au moment du build,
//               si bien qu'aucune adresse locale n'entre dans l'application de production.
// Voir README.md, « Environnements », et docs/production/environment.md (dépôt du site).

const PRODUCTION = {
  supabaseUrl: 'https://gpfdyslysqjmojgzggib.supabase.co',
  supabaseKey: 'sb_publishable_zdlM4FPqlwq-145lrVeYpw_rHqB7Drt',
};

// Expo remplace process.env.EXPO_PUBLIC_… par sa valeur au moment du build
const environnement = process.env.EXPO_PUBLIC_GOSHIP_ENV || 'production';
if (!['production', 'staging', 'essai'].includes(environnement)) {
  throw new Error('Environnement inconnu : ' + environnement);
}

// La préproduction : ses propres adresse et clé publiable. Elle ne cite jamais la
// production (qui n'entre ainsi pas dans son paquet) ; qu'elle n'y pointe pas, c'est
// essais/controle-paquet.mjs <paquet> staging qui le vérifie sur l'application construite.
function preproduction() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const cle = process.env.EXPO_PUBLIC_SUPABASE_CLE || '';
  if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url) || !cle.startsWith('sb_publishable_') || /REMPLACER/.test(url + cle)) {
    throw new Error('Préproduction mal configurée : EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_CLE (eas.json, profil staging)');
  }
  return { supabaseUrl: url, supabaseKey: cle };
}

const serveur = environnement === 'essai'
  ? { supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL, supabaseKey: 'cle-publique-essai' }
  : environnement === 'staging' ? preproduction() : PRODUCTION;

export default {
  environnement,
  ...serveur,

  // Le site : pages de réinitialisation du mot de passe et de fermeture du compte
  siteUrl: 'https://wilnergraph92.github.io/Goship-express-site/',

  // Coordonnées affichées dans l'application
  telephone: '+18495386262',
  telephoneAffiche: '+1 849 538-6262',
  whatsapp: '18495386262',
  email: 'goshipexpressllc@gmail.com',
  horaires: 'Lun–Sam · 8h–18h',

  // Adresse de réception en Floride : la même pour tous les clients.
  // Le client écrit son code juste après son nom, c'est ce qui identifie ses colis.
  adresseMiami: {
    ligne1: '8140 NW 74th Ave Unit 3',
    ligne2: 'APT-46780',
    ligne3: 'Medley, Florida 33166',
    pays: 'United States',
  },

  // Ce que voient les clients. Les factures, leurs paiements et le solde viennent de la
  // base (mes_factures, mon_resume), comme dans l'espace client du site. Mettez
  // « factures: false » pour cacher l'onglet Factures et l'écran de paiement.
  modules: {
    factures: true,
  },

  // Moyens de paiement des factures.
  // Les valeurs entre crochets restent à compléter : l'application les montre
  // « à compléter » et ne les propose pas à la copie.
  paiement: {
    // Paiement par carte (Visa, Mastercard).
    // Le jour où Azul est prêt : collez son lien dans « carteLien » et remplacez
    // « fournisseur » par 'azul'. Rien d'autre à changer dans l'application.
    fournisseur: 'paypal',                       // 'paypal' ou 'azul'
    carteLien: '',                               // lien de paiement d'Azul
    carteEmail: 'goshipexpressllc@gmail.com',    // compte PayPal qui encaisse
    carteDevise: 'USD',
    moyens: [
      { id: 'banque', nom: 'Compte bancaire', valeur: '[BANQUE ET NUMÉRO DE COMPTE]', icone: 'home' },
      { id: 'azul', nom: 'Azul', valeur: '[LIEN OU NUMÉRO AZUL]', icone: 'credit-card' },
      { id: 'moncash', nom: 'MonCash', valeur: '[NUMÉRO MONCASH]', icone: 'smartphone' },
      { id: 'natcash', nom: 'NatCash', valeur: '[NUMÉRO NATCASH]', icone: 'smartphone' },
    ],
  },

  // Agences. Une adresse entre crochets n'est pas encore connue : l'application écrit
  // « adresse communiquée sur demande » et ne propose pas d'itinéraire.
  agences: [
    {
      id: 'miami',
      ville: 'Miami — Medley',
      adresse: '8140 NW 74th Ave Unit 3\nMedley, Florida 33166',
      horaires: 'Lun–Sam · 8h–18h',
      telephone: '+18495386262',
      carte: '8140 NW 74th Ave Unit 3, Medley, FL 33166',
    },
    {
      id: 'pap',
      ville: 'Port-au-Prince',
      adresse: '[ADRESSE DE L’AGENCE]',
      horaires: '[HORAIRES]',
      telephone: '+18495386262',
      carte: 'Port-au-Prince, Haïti',
    },
    {
      id: 'sdq',
      ville: 'Santo Domingo',
      adresse: '[ADRESSE DE L’AGENCE]',
      horaires: '[HORAIRES]',
      telephone: '+18495386262',
      carte: 'Santo Domingo, République dominicaine',
    },
  ],
};

// Une valeur « [À COMPLÉTER] » laissée dans ce fichier
export function aCompleter(valeur) {
  return !valeur || /^\[.*\]$/.test(String(valeur).trim());
}
