// Connexion au projet Supabase (le même que le site et le tableau de bord).

import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import config from '../config';
import { coffre } from './coffre';

export const supabase = createClient(config.supabaseUrl, config.supabaseKey, {
  auth: {
    // La session dort dans le coffre-fort du téléphone (voir lib/coffre.js)
    storage: coffre,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// La session reste valable quand l'application revient au premier plan
AppState.addEventListener('change', (etat) => {
  if (etat === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
