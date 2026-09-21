// Session du client : connexion, inscription, profil et déconnexion.

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from './supabase';
import { monProfil } from './api';
import { oublierCeTelephone } from './notifications';

// Longueur minimale du mot de passe, la même que sur le site
// 6 : c'est le plancher de Supabase, sa console ne descend pas plus bas.
// En dessous, le formulaire accepterait et le serveur refuserait en anglais.
export const MDP_MINIMUM = 6;

const Contexte = createContext(null);

export function FournisseurSession({ children }) {
  const [session, setSession] = useState(null);
  const [profil, setProfil] = useState(null);
  const [pret, setPret] = useState(false);

  const chargerProfil = useCallback(async (utilisateur) => {
    if (!utilisateur) { setProfil(null); return null; }
    try {
      const p = await monProfil(utilisateur.id);
      setProfil(p);
      return p;
    } catch (e) {
      setProfil(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let vivant = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!vivant) return;
      setSession(data.session || null);
      await chargerProfil(data.session ? data.session.user : null);
      if (vivant) setPret(true);
    });

    const { data: ecoute } = supabase.auth.onAuthStateChange(async (_evenement, s) => {
      setSession(s || null);
      await chargerProfil(s ? s.user : null);
      setPret(true);
    });

    return () => { vivant = false; ecoute.subscription.unsubscribe(); };
  }, [chargerProfil]);

  const valeur = useMemo(() => ({
    session,
    profil,
    pret,
    connecte: !!session,

    async connexion(email, motDePasse) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: String(email || '').trim(),
        password: motDePasse,
      });
      if (error) throw error;
      return data;
    },

    async inscription(champs) {
      if (String(champs.motDePasse || '').length < MDP_MINIMUM) {
        const e = new Error('mot-de-passe-court');
        e.code = 'mot-de-passe-court';
        throw e;
      }
      const { data, error } = await supabase.auth.signUp({
        email: String(champs.email || '').trim(),
        password: champs.motDePasse,
        options: {
          data: {
            nom_complet: champs.nom_complet || '',
            pays: champs.pays || '',
            region: champs.region || '',
            ville: champs.ville || '',
            adresse: champs.adresse || '',
            telephone: champs.telephone || '',
            langue: champs.langue || 'fr',
          },
        },
      });
      if (error) throw error;
      // Adresse déjà inscrite : Supabase répond sans identité plutôt qu'avec une erreur
      const u = data.user;
      if (u && Array.isArray(u.identities) && u.identities.length === 0) {
        const e = new Error('email-existe');
        e.code = 'email-existe';
        throw e;
      }
      // Quand la confirmation de l'adresse e-mail est demandée (réglage conseillé
      // dans Supabase), il n'y a pas encore de session : le client doit d'abord
      // ouvrir le lien reçu dans sa boîte.
      return { ...data, confirmation: !data.session };
    },

    async motDePasseOublie(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(String(email || '').trim());
      if (error) throw error;
    },

    async deconnexion() {
      // D'abord détacher ce téléphone des notifications, tant que la session
      // permet encore de le faire ; ensuite seulement, fermer la session.
      await oublierCeTelephone();
      await supabase.auth.signOut();
      setProfil(null);
    },

    rafraichirProfil: () => chargerProfil(session ? session.user : null),
  }), [session, profil, pret, chargerProfil]);

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useSession() {
  const v = useContext(Contexte);
  if (!v) throw new Error('useSession hors du fournisseur de session');
  return v;
}
