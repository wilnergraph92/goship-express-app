// Session du client : connexion, inscription, profil et déconnexion.
//
// L'authentification est celle de Supabase, la même que le site : mêmes comptes,
// mêmes mots de passe, même réinitialisation par e-mail. La session est rangée dans le
// coffre-fort du téléphone (lib/coffre.js) ; aucun mot de passe n'est jamais gardé.

import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import config from '../config';
import { supabase } from './supabase';
import { monProfil, mesPermissions } from './api';
import { oublierCeTelephone } from './notifications';
import { journal } from './erreurs';

// Longueur minimale du mot de passe, la même que sur le site
// 6 : c'est le plancher de Supabase, sa console ne descend pas plus bas.
// En dessous, le formulaire accepterait et le serveur refuserait en anglais.
export const MDP_MINIMUM = 6;

export function emailValide(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || '').trim());
}

const Contexte = createContext(null);

export function FournisseurSession({ children }) {
  const [session, setSession] = useState(null);
  const [profil, setProfil] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [pret, setPret] = useState(false);
  // Vrai quand la session s'est terminée sans que l'utilisateur l'ait demandé
  // (jeton de renouvellement expiré ou révoqué) : l'écran de connexion le dit.
  const [sessionExpiree, setSessionExpiree] = useState(false);
  const deconnexionVoulue = useRef(false);
  const renouvellement = useRef(null);

  const chargerProfil = useCallback(async (utilisateur) => {
    if (!utilisateur) { setProfil(null); setPermissions(null); return null; }
    try {
      const [p, droits] = await Promise.all([
        monProfil(utilisateur.id),
        mesPermissions().catch(() => null),
      ]);
      setProfil(p);
      setPermissions(droits);
      return p;
    } catch (e) {
      // Hors ligne au démarrage : la session reste ouverte, le profil viendra plus tard
      journal('profil', 'profil non chargé', e);
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
    }).catch(() => { if (vivant) setPret(true); });

    const { data: ecoute } = supabase.auth.onAuthStateChange((evenement, s) => {
      if (evenement === 'SIGNED_OUT' && !deconnexionVoulue.current) setSessionExpiree(true);
      if (evenement === 'SIGNED_IN') setSessionExpiree(false);
      deconnexionVoulue.current = false;
      setSession(s || null);
      // Pas d'appel à la base DANS l'écouteur (supabase-js le déconseille) : après
      if (evenement !== 'TOKEN_REFRESHED') setTimeout(() => chargerProfil(s ? s.user : null), 0);
      setPret(true);
    });

    return () => { vivant = false; ecoute.subscription.unsubscribe(); };
  }, [chargerProfil]);

  const valeur = useMemo(() => ({
    session,
    profil,
    permissions,
    // Un compte de l'équipe (employé, gérant, administrateur) : l'application reste
    // l'espace CLIENT ; le tableau de bord est sur le site et l'application de bureau.
    equipe: !!(permissions && permissions.equipe),
    pret,
    connecte: !!session,
    sessionExpiree,

    async connexion(email, motDePasse) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: String(email || '').trim(),
        password: motDePasse,
      });
      if (error) throw error;
      setSessionExpiree(false);
      return data;
    },

    async inscription(champs) {
      if (!emailValide(champs.email)) {
        const e = new Error('email-invalide');
        e.code = 'email-invalide';
        throw e;
      }
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

    // Le lien reçu par e-mail ouvre la page « Nouveau mot de passe » du site, comme
    // pour un client du site : une seule réinitialisation pour toute la plateforme.
    async motDePasseOublie(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(String(email || '').trim(), {
        redirectTo: config.siteUrl + 'nouveau-mot-de-passe.html',
      });
      if (error) throw error;
    },

    async deconnexion() {
      deconnexionVoulue.current = true;
      // D'abord détacher ce téléphone des notifications, tant que la session
      // permet encore de le faire ; ensuite seulement, fermer la session.
      await oublierCeTelephone();
      // « local » : ce téléphone seulement, les autres appareils du client restent connectés
      await supabase.auth.signOut({ scope: 'local' });
      setProfil(null);
      setPermissions(null);
    },

    // Une requête a été refusée pour cause de session : on tente un renouvellement ;
    // s'il échoue, la session est fermée et l'écran de connexion le dit.
    // Un seul renouvellement à la fois : plusieurs écrans peuvent voir le même jeton
    // expiré en même temps, et un jeton de renouvellement ne sert qu'une fois — le
    // deuxième essai échouerait et déconnecterait le client pour rien.
    verifierSession() {
      if (!renouvellement.current) {
        renouvellement.current = (async () => {
          const { data, error } = await supabase.auth.refreshSession();
          if (error || !data.session) {
            await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
            setSessionExpiree(true);
            return false;
          }
          return true;
        })().finally(() => { renouvellement.current = null; });
      }
      return renouvellement.current;
    },

    rafraichirProfil: () => chargerProfil(session ? session.user : null),
  }), [session, profil, permissions, pret, sessionExpiree, chargerProfil]);

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useSession() {
  const v = useContext(Contexte);
  if (!v) throw new Error('useSession hors du fournisseur de session');
  return v;
}
