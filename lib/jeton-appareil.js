// Le jeton « appareil » du téléphone (FCM sur Android, APNs sur iPhone), celui
// qu'Expo transforme en jeton Expo pour la base.
//
// Pourquoi ce fichier : sur Android, expo-notifications réémet le jeton à tous les
// écouteurs de addPushTokenListener *chaque fois* qu'on le demande
// (getDevicePushTokenAsync, appelé aussi par getExpoPushTokenAsync — voir
// PushTokenModule.kt, « onNewToken(token) » juste après « promise.resolve »). Un écouteur
// qui réenregistre le téléphone à chaque événement se relance donc lui-même, sans fin :
// du 24 au 26/10/2026, chaque téléphone Android ouvert appelait enregistrer_appareil
// 500 à 900 fois par minute. On ne réagit plus qu'à un jeton différent du dernier vu.
//
// Aucun import : le banc d'essai (essais/essai-logique.mjs) charge ce fichier tel quel
// et le fait tourner contre un faux module de notifications qui se comporte comme
// celui d'Android.

let dernierVu = null;

function enTexte(jeton) {
  if (jeton == null || jeton === '') return null;
  return typeof jeton === 'string' ? jeton : JSON.stringify(jeton);
}

// Retient le jeton ; vrai seulement s'il est nouveau
export function retenirJetonAppareil(jeton) {
  const texte = enTexte(jeton);
  if (!texte || texte === dernierVu) return false;
  dernierVu = texte;
  return true;
}

// Déconnexion : le prochain compte repart de zéro
export function oublierJetonAppareil() {
  dernierVu = null;
}

// Le jeton Expo du téléphone. Le jeton appareil est demandé ici une seule fois et
// retenu aussitôt, pour que son écho soit ignoré par l'écouteur (si l'écho arrive
// avant, l'écouteur le retient lui-même : un seul enregistrement de plus, pas une
// boucle). Il est ensuite donné à Expo, qui sinon le redemanderait : un écho de plus.
export async function jetonExpo(Notifications, projectId) {
  const appareil = await Notifications.getDevicePushTokenAsync();
  retenirJetonAppareil(appareil && appareil.data);
  const expo = await Notifications.getExpoPushTokenAsync({ projectId, devicePushToken: appareil });
  return expo && expo.data;
}

// Le système peut changer le jeton du téléphone (restauration, mise à jour…) : on
// réenregistre alors le téléphone, mais jamais pour l'écho d'un jeton déjà vu.
export function ecouterJetonAppareil(Notifications, reenregistrer) {
  return Notifications.addPushTokenListener((evenement) => {
    if (!retenirJetonAppareil(evenement && evenement.data)) return;
    reenregistrer();
  });
}
