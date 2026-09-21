// Réglages de l'application GoShip Express.
// La clé « publiable » est prévue pour être lue par les clients : elle ne donne accès
// qu'à ce que les règles de sécurité de Supabase autorisent (comme sur le site).

export default {
  // Même projet Supabase que le site et le tableau de bord
  supabaseUrl: 'https://gpfdyslysqjmojgzggib.supabase.co',
  supabaseKey: 'sb_publishable_zdlM4FPqlwq-145lrVeYpw_rHqB7Drt',

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

  // Ce que voient les clients. Mettez « factures: true » le jour où vous êtes prêt :
  // l'onglet Factures et l'écran de paiement réapparaissent, rien d'autre à changer.
  modules: {
    factures: false,
  },

  // Moyens de paiement des factures.
  // « paypalLien » sert quand une facture n'a pas son propre lien de paiement.
  // Les valeurs entre crochets restent à compléter.
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

  // Agences (les adresses manquantes restent à compléter)
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
