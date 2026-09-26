// Où l'application range la session du client (le jeton qui le tient connecté).
//
// Elle utilise le coffre-fort du téléphone — Keychain sur iPhone, Keystore sur
// Android — plutôt que le simple stockage de l'application : le jeton est alors
// chiffré par le système et protégé par le code de déverrouillage. Une sauvegarde
// du téléphone, un câble branché sur un ordinateur ou un téléphone « rooté » ne
// suffisent plus à le récupérer.
//
// Le coffre n'accepte que de petites valeurs (2 Ko sur iPhone) : la session est
// donc découpée en morceaux. Les sessions déjà enregistrées en clair par les
// anciennes versions sont déplacées dans le coffre à la première ouverture.

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const TAILLE = 1800; // marge sous la limite du coffre iOS

// Sur le web (aperçu dans le navigateur), le coffre n'existe pas.
const disponible = Platform.OS === 'ios' || Platform.OS === 'android';

function morceau(cle, i) { return cle + '.' + i; }

async function effacerMorceaux(cle) {
  const nb = Number(await SecureStore.getItemAsync(cle + '.n')) || 0;
  for (let i = 0; i < nb; i += 1) await SecureStore.deleteItemAsync(morceau(cle, i));
  await SecureStore.deleteItemAsync(cle + '.n');
}

// Écrit la session au coffre, morceau par morceau. Lève une erreur si le coffre
// refuse (très vieil appareil, ou application de simulateur non signée : le
// trousseau d'iOS n'y est pas accessible).
async function ecrireCoffre(cle, valeur) {
  await effacerMorceaux(cle);
  const texte = String(valeur);
  const nb = Math.max(1, Math.ceil(texte.length / TAILLE));
  for (let i = 0; i < nb; i += 1) {
    await SecureStore.setItemAsync(morceau(cle, i), texte.slice(i * TAILLE, (i + 1) * TAILLE));
  }
  await SecureStore.setItemAsync(cle + '.n', String(nb));
}

export const coffre = {
  async getItem(cle) {
    if (!disponible) return AsyncStorage.getItem(cle);
    let nb = 0;
    try {
      nb = Number(await SecureStore.getItemAsync(cle + '.n')) || 0;
      if (nb > 0) {
        const bouts = [];
        for (let i = 0; i < nb; i += 1) {
          const b = await SecureStore.getItemAsync(morceau(cle, i));
          if (b === null) return null; // coffre incomplet : on repart d'une connexion
          bouts.push(b);
        }
        return bouts.join('');
      }
    } catch (e) {
      // Coffre illisible : la session a pu être rangée à côté (voir setItem)
      return AsyncStorage.getItem(cle);
    }
    // Session laissée en clair (ancienne version, ou coffre qui refusait d'écrire) :
    // on la met au coffre. La copie en clair n'est effacée qu'une fois le coffre
    // écrit — sinon ce serait la seule copie, et le client serait déconnecté.
    const ancienne = await AsyncStorage.getItem(cle);
    if (ancienne !== null) {
      try {
        await ecrireCoffre(cle, ancienne);
        await AsyncStorage.removeItem(cle);
      } catch (e) { /* le coffre refuse encore : la copie reste où elle est */ }
    }
    return ancienne;
  },

  async setItem(cle, valeur) {
    if (!disponible) return AsyncStorage.setItem(cle, valeur);
    try {
      await ecrireCoffre(cle, valeur);
      await AsyncStorage.removeItem(cle); // plus de copie en clair derrière le coffre
    } catch (e) {
      // Coffre indisponible : mieux vaut une session utilisable qu'une
      // application qui ne se connecte plus.
      await AsyncStorage.setItem(cle, String(valeur));
    }
  },

  async removeItem(cle) {
    if (!disponible) return AsyncStorage.removeItem(cle);
    try {
      await effacerMorceaux(cle);
    } catch (e) { /* rien à effacer */ }
    await AsyncStorage.removeItem(cle);
  },
};

export default coffre;
