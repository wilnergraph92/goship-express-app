// Point d'entrée : polices, langue, session, puis aiguillage vers la connexion ou l'application.

import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
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
import { activerNotifications, useOuvertureParNotification } from '../lib/notifications';
import { couleurs } from '../lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Aiguillage() {
  const { pret, connecte } = useSession();
  const { langue } = useLangue();
  const segments = useSegments();
  const router = useRouter();

  useOuvertureParNotification();

  // L'écran d'accueil (logo sur fond blanc) reste affiché au moins le temps d'être vu
  const [delaiPasse, setDelaiPasse] = useState(false);
  useEffect(() => {
    const minuteur = setTimeout(() => setDelaiPasse(true), 1400);
    return () => clearTimeout(minuteur);
  }, []);

  useEffect(() => {
    if (!pret || !delaiPasse) return;
    SplashScreen.hideAsync().catch(() => {});
    const dansLApplication = segments[0] === '(onglets)' || segments[0] === 'colis' || segments[0] === 'agences' || segments[0] === 'paiement' || segments[0] === 'scanner';
    if (!connecte && dansLApplication) router.replace('/connexion');
    else if (connecte && (segments[0] === 'connexion' || segments[0] === 'inscription' || segments.length === 0)) router.replace('/(onglets)');
  }, [pret, delaiPasse, connecte, segments, router]);

  useEffect(() => {
    if (connecte) activerNotifications(langue).catch(() => {});
  }, [connecte, langue]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: couleurs.fond } }}>
      <Stack.Screen name="(onglets)" />
      <Stack.Screen name="connexion" />
      <Stack.Screen name="inscription" />
      <Stack.Screen name="colis/[id]" />
      <Stack.Screen name="agences" />
      <Stack.Screen name="paiement" />
      <Stack.Screen name="scanner" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function Racine() {
  const [policesPretes] = useFonts({
    Archivo_700Bold,
    Archivo_800ExtraBold,
    Manrope_500Medium,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  });

  if (!policesPretes) return <View style={{ flex: 1, backgroundColor: couleurs.nuit }} />;

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
