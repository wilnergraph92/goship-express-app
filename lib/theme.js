// Couleurs, polices et ombres de l'application (mêmes repères visuels que le site).

export const couleurs = {
  nuit: '#061a3f',
  nuitProfond: '#030f2b',
  accent: '#f4600d',
  accentSombre: '#d4500a',
  accentDoux: 'rgba(244,96,13,0.13)',
  fond: '#f5f7fc',
  carte: '#ffffff',
  bord: '#eef2f9',
  bordFort: '#dfe6f3',
  texte: '#0d1b3e',
  texteDoux: '#5b6782',
  texteFaible: '#8a93ac',
  surNuit: '#b9c6e4',
  voileClair: 'rgba(255,255,255,0.10)',
  bleu: '#2563eb',
  ambre: '#b45309',
  vert: '#0e9f6e',
  rouge: '#c0392b',
};

// Un statut = une couleur, un fond et une position dans la frise (sur 5 étapes)
export const STATUTS = {
  recu:         { couleur: '#0d2b6b', fond: 'rgba(13,43,107,0.10)',  barre: '#0d2b6b', etape: 1 },
  emballe:      { couleur: '#6d28d9', fond: 'rgba(109,40,217,0.12)', barre: '#7c3aed', etape: 2 },
  embarque:     { couleur: '#1d4ed8', fond: 'rgba(37,99,235,0.12)',  barre: '#2563eb', etape: 3 },
  distribution: { couleur: '#92400e', fond: 'rgba(180,83,9,0.14)',   barre: '#b45309', etape: 4 },
  succursale:   { couleur: '#c2410c', fond: 'rgba(234,88,12,0.13)',  barre: '#ea580c', etape: 5 },
  disponible:   { couleur: '#0f766e', fond: 'rgba(15,118,110,0.13)', barre: '#0f766e', etape: 6 },
  livre:        { couleur: '#0a7d57', fond: 'rgba(14,159,110,0.13)', barre: '#0e9f6e', etape: 7 },
  incident:     { couleur: '#b91c1c', fond: 'rgba(220,38,38,0.12)',  barre: '#dc2626', etape: 3 },
};

export const ETAPES = 7;

// L'état d'une facture, tel que la base le déduit (etat_paiement) : une couleur, une icône
export const COULEURS_ETAT = {
  a_payer: { texte: '#c4500b', fond: couleurs.accentDoux, icone: 'file-text' },
  partielle: { texte: '#1d4ed8', fond: 'rgba(37,99,235,0.12)', icone: 'pie-chart' },
  en_retard: { texte: '#b91c1c', fond: 'rgba(220,38,38,0.12)', icone: 'alert-circle' },
  payee: { texte: couleurs.vert, fond: 'rgba(14,159,110,0.13)', icone: 'check' },
  annulee: { texte: couleurs.texteFaible, fond: '#eef2f9', icone: 'x' },
};


export const polices = {
  titre: 'Archivo_800ExtraBold',
  titreMoyen: 'Archivo_700Bold',
  corps: 'Manrope_500Medium',
  corpsGras: 'Manrope_700Bold',
  corpsTresGras: 'Manrope_800ExtraBold',
  mono: 'IBMPlexMono_500Medium',
  monoGras: 'IBMPlexMono_600SemiBold',
};

export const ombres = {
  carte: {
    shadowColor: '#061a3f',
    shadowOpacity: 0.09,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  bouton: {
    shadowColor: '#f4600d',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
};

export const rayons = { carte: 22, champ: 15, bouton: 16, pastille: 999 };
