// Notifications sur le téléphone (colis reçu, disponible, livré).
// Le jeton du téléphone est rangé dans la table « appareils » : le serveur s'en sert
// pour prévenir ce client précis, comme il envoie déjà les e-mails.
//
// Expo Go (l'application d'essai) ne sait plus recevoir les notifications depuis la
// version 53 : on ne charge donc le module que dans la vraie application installée.
// Tout le reste fonctionne pareil dans les deux cas.

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { router } from 'expo-router';
import { enregistrerAppareil, oublierAppareil } from './api';

// Écrans qu'une notification a le droit d'ouvrir. N'importe qui connaissant le
// jeton d'un téléphone peut lui envoyer une notification : elle ne doit donc
// pouvoir emmener le client que sur ses propres écrans.
const ROUTES = ['/(onglets)', '/(onglets)/colis', '/(onglets)/compte', '/agences'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

function identifiantProjet() {
  const e = Constants.expoConfig || {};
  return (e.extra && e.extra.eas && e.extra.eas.projectId) || Constants.easConfig?.projectId || null;
}

export async function activerNotifications(langue) {
  const Notifications = pushModule();
  if (!Notifications) return null;
  if (!Device.isDevice) return null; // les simulateurs ne reçoivent pas de notification

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('colis', {
      name: 'Suivi des colis',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#f4600d',
    });
  }

  const existante = await Notifications.getPermissionsAsync();
  let accord = existante.status;
  if (accord !== 'granted') {
    const demande = await Notifications.requestPermissionsAsync();
    accord = demande.status;
  }
  if (accord !== 'granted') return null;

  const projectId = identifiantProjet();
  if (!projectId) return null; // sera disponible une fois le projet EAS créé

  const { data: jeton } = await Notifications.getExpoPushTokenAsync({ projectId });
  if (!jeton) return null;

  try {
    await enregistrerAppareil(jeton, Platform.OS, langue || 'fr');
    jetonEnCours = jeton;
  } catch (e) {
    // L'application fonctionne même si l'enregistrement échoue
  }
  return jeton;
}

// Déconnexion : ce téléphone ne doit plus recevoir les colis de ce client.
// Sans cela, la personne suivante à se connecter sur le même téléphone verrait
// passer les notifications du client précédent.
export async function oublierCeTelephone() {
  const jeton = jetonEnCours;
  jetonEnCours = null;
  if (!jeton) return;
  try {
    await oublierAppareil(jeton);
  } catch (e) {
    // Rien à faire : la base oubliera ce téléphone à la prochaine connexion
  }
}

// Ouvre le colis concerné quand le client touche la notification
export function useOuvertureParNotification() {
  const dejaTraite = useRef(false);

  useEffect(() => {
    const Notifications = pushModule();
    if (!Notifications) return undefined;

    const aller = (reponse) => {
      const donnees = reponse?.notification?.request?.content?.data || {};
      const colis = String(donnees.colis_id || '');
      const route = String(donnees.route || '');
      if (UUID.test(colis)) router.push('/colis/' + colis);
      else if (ROUTES.indexOf(route) >= 0) router.push(route);
    };

    Notifications.getLastNotificationResponseAsync().then((reponse) => {
      if (reponse && !dejaTraite.current) { dejaTraite.current = true; aller(reponse); }
    });

    const ecoute = Notifications.addNotificationResponseReceivedListener(aller);
    return () => ecoute.remove();
  }, []);
}
