// Charger les données d'un écran, et savoir dans quel état il est.
//
//   donnees === undefined            chargement en cours (premier chargement)
//   donnees + erreur                 données déjà affichées, mais la mise à jour a
//                                    échoué (hors ligne…) : l'écran les garde et le dit
//   pas de donnees + erreur          rien à montrer : l'écran explique pourquoi
//
// Il n'y a aucune copie des données sur le téléphone : ce qui est montré vient du
// serveur, et reste en mémoire le temps de la visite (données métier = serveur).
// Une session refusée par le serveur est vérifiée une fois ; si elle ne se renouvelle
// pas, l'utilisateur est renvoyé à la connexion avec un message.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from './session';
import { classer } from './erreurs';

export function useDonnees(charger, deps = []) {
  const [donnees, setDonnees] = useState(undefined);
  const [erreur, setErreur] = useState(null);
  const [rafraichit, setRafraichit] = useState(false);
  const { verifierSession } = useSession();
  const vivant = useRef(true);
  const numero = useRef(0);

  useEffect(() => { vivant.current = true; return () => { vivant.current = false; }; }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const recharger = useCallback(async () => {
    numero.current += 1;
    const ce = numero.current;
    try {
      const d = await charger();
      // Seule la réponse à la dernière demande compte (recherche tapée vite, filtres…)
      if (!vivant.current || ce !== numero.current) return;
      setDonnees(d);
      setErreur(null);
    } catch (e) {
      if (!vivant.current || ce !== numero.current) return;
      if (classer(e).type === 'session') {
        const encore = await verifierSession();
        if (encore && vivant.current && ce === numero.current) {
          try {
            const d = await charger();
            if (vivant.current && ce === numero.current) { setDonnees(d); setErreur(null); }
            return;
          } catch (e2) { e = e2; } // eslint-disable-line no-param-reassign
        }
      }
      if (vivant.current && ce === numero.current) setErreur(e);
    }
  }, deps);

  useEffect(() => { recharger(); }, [recharger]);

  const tirer = useCallback(async () => {
    setRafraichit(true);
    await recharger();
    if (vivant.current) setRafraichit(false);
  }, [recharger]);

  return { donnees, setDonnees, erreur, recharger, rafraichit, tirer, chargement: donnees === undefined && !erreur };
}
