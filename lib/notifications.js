// Notifications sur le téléphone (colis reçu, disponible, livré…).
//
// Le jeton du téléphone est rangé dans la table « appareils » par la base
// (enregistrer_appareil) ; à chaque changement de statut d'un colis, la base envoie
// elle-même la notification par le service d'Expo (outils/supabase.sql, pousser_colis).
// L'application ne fabrique aucune notification.
//
// Pour qu'une notification arrive vraiment, il faut les quatre : la permission du
// téléphone, un projet EAS (extra.eas.projectId dans app.json), les clés d'Apple
// (APNs) et de Google (FCM) déposées chez Expo, et un vrai téléphone. L'état ci-dessous
// dit honnêtement ce qui manque : « permission accordée » ne veut pas dire « notifications
// en service ».
//
// Expo Go (l'application d'essai) ne sait plus recevoir les notifications depuis la
// version 53 : on ne charge donc le module que dans la vraie application installée.

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { router } from 'expo-router';
import { enregistrerAppareil, oublierAppareil } from './api';
import { journal } from './erreurs';

// Écrans qu'une notification a le droit d'ouvrir. N'importe qui connaissant le
// jeton d'un téléphone peut lui envoyer une notification : elle ne doit donc
// pouvoir emmener le client que sur ses propres écrans (et la base refuse de toute
// façon de montrer le colis d'un autre).
const ROUTES = ['/(onglets)', '/(onglets)/colis', '/(onglets)/compte', '/(onglets)/factures',
  '/(onglets)/prealerte', '/agences'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Où en sont les notifications sur ce téléphone :
//   active          jeton enregistré par la base : les notifications peuvent arriver
//   refusee         l'utilisateur a refusé (à rouvrir dans les réglages du téléphone)
//   indisponible    navigateur, Expo Go ou simulateur : impossible ici
//   non_configuree  projet EAS absent (app.json) : aucune notification ne peut partir
//   erreur          jeton ou enregistrement impossible (réseau, service Expo…)
//   inconnue        pas encore demandé
let etatActuel = 'inconnue';
const abonnes = new Set();
function poserEtat(e) {
  etatActuel = e;
  abonnes.forEach((f) => f(e));
}
export function etatNotifications() { return etatActuel; }
export function surEtatNotifications(f) { abonnes.add(f); return () => abonnes.delete(f); }

export function notificationsPossibles() {
  return Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
}

// Jeton de ce téléphone pendant la session en cours (oublié à la déconnexion)
let jetonEnCours = null;

// Chargé seulement quand c'est possible : un simple import planterait dans Expo Go
let module_ = null;
function pushModule() {
  if (!notificationsPossibles()) return null;
  if (!module_) {
    module_ = require('expo-notifications');
    module_.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }
  return module_;
}

export function identifiantProjet() {
  const e = Constants.expoConfig || {};
  return (e.extra && e.extra.eas && e.extra.eas.projectId) || (Constants.easConfig && Constants.easConfig.projectId) || null;
}

async function enregistrer(Notifications, langue) {
  const projectId = identifiantProjet();
  if (!projectId) { poserEtat('non_configuree'); return null; }
  let jeton = null;
  try {
    jeton = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (e) {
    journal('notifications', 'jeton indisponible', e);
    poserEtat('erreur');
    return null;
  }
  if (!jeton) { poserEtat('erreur'); return null; }
  try {
    await enregistrerAppareil(jeton, Platform.OS, langue || 'fr');
    jetonEnCours = jeton;
    poserEtat('active');
  } catch (e) {
    // L'application fonctionne même si l'enregistrement échoue ; on réessaiera
    // à la prochaine ouverture
    journal('notifications', 'enregistrement refusé', e);
    poserEtat('erreur');
  }
  return jeton;
}

// demander : faut-il afficher la question du système ? (non au démarrage si déjà refusé)
export async function activerNotifications(langue, { demander = true } = {}) {
  const Notifications = pushModule();
  if (!Notifications) { poserEtat('indisponible'); return null; }
  if (!Device.isDevice) { poserEtat('indisponible'); return null; }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('colis', {
      name: 'GoShip Express',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#f4600d',
    });
  }

  const existante = await Notifications.getPermissionsAsync();
  let accord = existante.status;
  if (accord !== 'granted' && demander && existante.canAskAgain !== false) {
    accord = (await Notifications.requestPermissionsAsync()).status;
  }
  if (accord !== 'granted') { poserEtat('refusee'); return null; }
  return enregistrer(Notifications, langue);
}

// Le système peut changer le jeton du téléphone (restauration, mise à jour…) :
// la base reçoit aussitôt le nouveau.
export function useSuiviJeton(connecte, langue) {
  useEffect(() => {
    const Notifications = pushModule();
    if (!Notifications || !connecte) return undefined;
    const ecoute = Notifications.addPushTokenListener(() => {
      enregistrer(Notifications, langue).catch(() => {});
    });
    return () => ecoute.remove();
  }, [connecte, langue]);
}

// Déconnexion : ce téléphone ne doit plus recevoir les colis de ce client.
// Sans cela, la personne suivante à se connecter sur le même téléphone verrait
// passer les notifications du client précédent.
export async function oublierCeTelephone() {
  const jeton = jetonEnCours;
  jetonEnCours = null;
  poserEtat('inconnue');
  if (!jeton) return;
  try {
    await oublierAppareil(jeton);
  } catch (e) {
    // Rien à faire : la base rattachera ce téléphone au prochain compte connecté
  }
}

// Où mène une notification touchée (null : nulle part)
export function destinationNotification(donnees) {
  const d = donnees || {};
  const colis = String(d.colis_id || '');
  const route = String(d.route || '');
  if (UUID.test(colis)) return '/colis/' + colis;
  if (ROUTES.indexOf(route) >= 0) return route;
  return null;
}

// Ouvre le colis concerné quand le client touche la notification, que l'application
// ait été fermée, en arrière-plan ou ouverte
export function useOuvertureParNotification(connecte) {
  const dejaTraite = useRef(false);

  useEffect(() => {
    const Notifications = pushModule();
    if (!Notifications || !connecte) return undefined;

    const aller = (reponse) => {
      const cible = destinationNotification(reponse?.notification?.request?.content?.data);
      if (cible) router.push(cible);
    };

    Notifications.getLastNotificationResponseAsync().then((reponse) => {
      if (reponse && !dejaTraite.current) { dejaTraite.current = true; aller(reponse); }
    }).catch(() => {});

    const ecoute = Notifications.addNotificationResponseReceivedListener(aller);
    return () => ecoute.remove();
  }, [connecte]);
}
