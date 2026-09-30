// Point d'entrée : polices, langue, session, puis aiguillage vers la connexion ou l'application.
//
//   Lancement (logo) → session ?  non → Connexion
//                                 oui → Accueil
//
// L'aiguillage suit l'état de la session : après une déconnexion (voulue ou non), aucun
// écran privé ne reste accessible, même par le bouton « retour ». Un lien ou une
// notification ouverts sans être connecté (goshipexpress://colis/…) mènent à leur
// écran juste après la connexion.

import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Archivo_700Bold } from '@expo-google-fonts/archivo/700Bold';
import { Archivo_800ExtraBold } from '@expo-google-fonts/archivo/800ExtraBold';
import { Manrope_500Medium } from '@expo-google-fonts/manrope/500Medium';
import { Manrope_700Bold } from '@expo-google-fonts/manrope/700Bold';
import { Manrope_800ExtraBold } from '@expo-google-fonts/manrope/800ExtraBold';
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono/500Medium';
import { IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono/600SemiBold';

import { FournisseurLangue, useLangue } from '../lib/i18n';
import { FournisseurSession, useSession } from '../lib/session';
import { activerNotifications, useOuvertureParNotification, useSuiviJeton } from '../lib/notifications';
import { couleurs } from '../lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const PUBLICS = ['connexion', 'inscription'];
// Écrans où un lien peut mener après la connexion
const DESTINATION = /^\/(colis\/[0-9a-f-]{36}|suivi|facture\/[0-9a-f-]{36}|agences|colis|factures|prealerte|compte)$/i;

function Aiguillage() {
  const { pret, connecte } = useSession();
  const { langue } = useLangue();
  const segments = useSegments();
  const chemin = usePathname();
  const router = useRouter();
  const apresConnexion = useRef(null);

  useOuvertureParNotification(connecte);
  useSuiviJeton(connecte, langue);

  useEffect(() => {
    if (!pret) return;
    SplashScreen.hideAsync().catch(() => {});
    const publique = segments.length === 0 || PUBLICS.indexOf(segments[0]) >= 0;
    if (!connecte && !publique) {
      if (DESTINATION.test(chemin)) apresConnexion.current = chemin;
      router.replace('/connexion');
    } else if (connecte && publique) {
      const cible = apresConnexion.current;
      apresConnexion.current = null;
      router.replace('/(onglets)');
      if (cible) setTimeout(() => router.push(cible), 0);
    }
  }, [pret, connecte, segments, chemin, router]);

  useEffect(() => {
    if (connecte) activerNotifications(langue).catch(() => {});
  }, [connecte, langue]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: couleurs.fond } }}>
      <Stack.Screen name="(onglets)" />
      <Stack.Screen name="connexion" options={{ gestureEnabled: false }} />
      <Stack.Screen name="inscription" />
      <Stack.Screen name="colis/[id]" />
      <Stack.Screen name="facture/[id]" />
      <Stack.Screen name="suivi" />
      <Stack.Screen name="agences" />
      <Stack.Screen name="messages" />
      <Stack.Screen name="profil" />
      <Stack.Screen name="paiement" />
      <Stack.Screen name="scanner" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function Racine() {
  const [policesPretes, erreurPolices] = useFonts({
    Archivo_700Bold,
    Archivo_800ExtraBold,
    Manrope_500Medium,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  });

  // Polices illisibles : l'application démarre quand même, avec celles du système
  if (!policesPretes && !erreurPolices) return <View style={{ flex: 1, backgroundColor: couleurs.fond }} />;

  return (
    <SafeAreaProvider>
      <FournisseurLangue>
        <FournisseurSession>
          <StatusBar style="light" />
          <Aiguillage />
        </FournisseurSession>
      </FournisseurLangue>
    </SafeAreaProvider>
  );
}
