// Lecture d'un code avec l'appareil photo.
//
// Deux usages, un seul lecteur (lib/scan.js, la copie de celui du site) :
//   mode « prealerte »  le suivi du vendeur sur le carton ou le bon de commande
//                       → renvoyé dans le formulaire de pré-alerte
//   mode « colis »      une étiquette GoShip (Code128 = numéro, QR = lien de suivi) ou
//                       un suivi de vendeur → ouvre le colis (écran « Suivi »)
// Ce n'est PAS le poste de scan de l'équipe (lecteur USB/Bluetooth du tableau de bord) :
// ici, rien ne change le statut d'un colis ; on ne fait que retrouver ou noter un numéro.

import { useRef, useState } from 'react';
import { View, Pressable, Linking, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { couleurs } from '../lib/theme';
import { Titre, Texte, Bouton, Chargement } from '../components/ui';
import { useLangue } from '../lib/i18n';
import { analyser, FORMATS } from '../lib/scan';

// Le même code lu plusieurs fois de suite n'est traité qu'une fois
const PAUSE_MS = 2500;

export default function Scanner() {
  const { t } = useLangue();
  const { mode } = useLocalSearchParams();
  const pourColis = mode === 'colis';
  const marges = useSafeAreaInsets();
  const [permission, demanderPermission] = useCameraPermissions();
  const [avis, setAvis] = useState('');
  const [cameraKo, setCameraKo] = useState(false);
  const fini = useRef(false);
  const dernier = useRef({ code: '', quand: 0 });

  function lu(brut) {
    if (fini.current) return;
    const maintenant = Date.now();
    if (brut === dernier.current.code && maintenant - dernier.current.quand < PAUSE_MS) return;
    dernier.current = { code: brut, quand: maintenant };

    const r = analyser(brut);
    if (!r.ok) { setAvis(t('sc.invalide')); return; }
    if (pourColis) {
      fini.current = true;
      router.replace({ pathname: '/suivi', params: { numero: r.reference } });
      return;
    }
    // Pré-alerte : le suivi du vendeur, pas une étiquette GoShip
    if (r.type !== 'suivi_vendeur') { setAvis(t('sc.etiquette_goship')); return; }
    fini.current = true;
    router.replace({ pathname: '/(onglets)/prealerte', params: { suivi: r.reference } });
  }

  // Refus définitif (« Ne plus demander ») : seul le réglage du téléphone peut le lever
  const bloquee = permission && !permission.granted && permission.canAskAgain === false;

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      {permission?.granted && !cameraKo ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: FORMATS }}
          onBarcodeScanned={({ data }) => lu(String(data || ''))}
          onMountError={() => setCameraKo(true)}
        />
      ) : null}

      <View style={[styles.haut, { paddingTop: marges.top + 12 }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(onglets)'))}
          style={styles.rond}
          accessibilityRole="button"
          accessibilityLabel={t('gen.fermer')}
          testID="scanner-fermer"
        >
          <Feather name="x" size={22} color="#ffffff" />
        </Pressable>
        <Titre taille={17} couleur="#ffffff">{pourColis ? t('sc.titre_colis') : t('pa.scanner')}</Titre>
        <View style={{ width: 44 }} />
      </View>

      {!permission ? (
        <Chargement />
      ) : permission.granted && !cameraKo ? (
        <>
          <View style={styles.cadre} pointerEvents="none">
            <View style={[styles.coin, { top: 0, left: 0, borderLeftWidth: 4, borderTopWidth: 4 }]} />
            <View style={[styles.coin, { top: 0, right: 0, borderRightWidth: 4, borderTopWidth: 4 }]} />
            <View style={[styles.coin, { bottom: 0, left: 0, borderLeftWidth: 4, borderBottomWidth: 4 }]} />
            <View style={[styles.coin, { bottom: 0, right: 0, borderRightWidth: 4, borderBottomWidth: 4 }]} />
          </View>
          <View style={[styles.bas, { paddingBottom: marges.bottom + 24 }]} accessibilityLiveRegion="polite">
            <Texte style={{ color: '#ffffff', textAlign: 'center', lineHeight: 21 }}>{avis || t('sc.viser')}</Texte>
          </View>
        </>
      ) : (
        <View style={styles.refus} testID="scanner-refus">
          <Feather name={cameraKo ? 'camera-off' : 'camera'} size={36} color="#ffffff" />
          <Texte style={{ color: '#ffffff', textAlign: 'center', lineHeight: 21, marginTop: 14 }}>
            {cameraKo ? t('sc.indisponible') : bloquee ? t('sc.bloquee') : t('pa.camera_refus')}
          </Texte>
          {cameraKo ? null : bloquee ? (
            <Bouton titre={t('gen.reglages')} icone="settings" onPress={() => Linking.openSettings().catch(() => {})}
              style={{ marginTop: 18, alignSelf: 'stretch' }} />
          ) : (
            <Bouton titre={t('sc.autoriser')} icone="camera" onPress={demanderPermission}
              style={{ marginTop: 18, alignSelf: 'stretch' }} testID="scanner-autoriser" />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  haut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 14,
    backgroundColor: 'rgba(6,26,63,0.55)',
  },
  rond: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  cadre: {
    position: 'absolute',
    top: '32%',
    left: '12%',
    right: '12%',
    height: 190,
  },
  coin: { position: 'absolute', width: 34, height: 34, borderColor: couleurs.accent, borderRadius: 6 },
  bas: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 24, paddingTop: 18, backgroundColor: 'rgba(6,26,63,0.55)' },
  refus: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
});
