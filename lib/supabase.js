// Connexion au projet Supabase (le même que le site et le tableau de bord).

import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import config from '../config';
import { coffre } from './coffre';

// Au-delà, une requête est abandonnée : l'écran dit « le serveur ne répond pas »
// plutôt que de tourner sans fin sur un réseau qui ne répond plus.
export const DELAI_MAX_MS = 20000;

function fetchAvecDelai(entree, options = {}) {
  const controle = new AbortController();
  const minuteur = setTimeout(() => controle.abort(), DELAI_MAX_MS);
  // Un abandon demandé par l'appelant reste possible
  if (options.signal) {
    if (options.signal.aborted) controle.abort();
    else options.signal.addEventListener('abort', () => controle.abort());
  }
  return fetch(entree, { ...options, signal: controle.signal }).finally(() => clearTimeout(minuteur));
}

export const supabase = createClient(config.supabaseUrl, config.supabaseKey, {
  auth: {
    // La session dort dans le coffre-fort du téléphone (voir lib/coffre.js)
    storage: coffre,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: { fetch: fetchAvecDelai },
});

// La session reste valable quand l'application revient au premier plan ; en arrière-plan,
// rien ne tourne (ni minuterie, ni réseau)
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (etat) => {
    if (etat === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
