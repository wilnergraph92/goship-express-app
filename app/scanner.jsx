// Lecture du code-barres d'un colis avec l'appareil photo.

import { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { couleurs } from '../lib/theme';
import { Titre, Texte, Bouton } from '../components/ui';
import { useLangue } from '../lib/i18n';

export default function Scanner() {
  const { t } = useLangue();
  const marges = useSafeAreaInsets();
  const [permission, demanderPermission] = useCameraPermissions();
  const [lu, setLu] = useState(false);

  function renvoyer(code) {
    if (lu) return;
    setLu(true);
    router.replace({ pathname: '/(onglets)/prealerte', params: { suivi: code } });
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      {permission?.granted ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['code128', 'code39', 'ean13', 'ean8', 'upc_a', 'upc_e', 'itf14', 'qr'] }}
          onBarcodeScanned={({ data }) => renvoyer(String(data || '').trim())}
        />
      ) : null}

      <View style={[styles.haut, { paddingTop: marges.top + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.rond}
          accessibilityRole="button"
          accessibilityLabel={t('gen.fermer')}
        >
          <Feather name="x" size={22} color="#ffffff" />
        </Pressable>
        <Titre taille={17} couleur="#ffffff">{t('pa.scanner')}</Titre>
        <View style={{ width: 44 }} />
      </View>

      {permission?.granted ? (
        <View style={styles.cadre} pointerEvents="none">
          <View style={[styles.coin, { top: 0, left: 0, borderLeftWidth: 4, borderTopWidth: 4 }]} />
          <View style={[styles.coin, { top: 0, right: 0, borderRightWidth: 4, borderTopWidth: 4 }]} />
          <View style={[styles.coin, { bottom: 0, left: 0, borderLeftWidth: 4, borderBottomWidth: 4 }]} />
          <View style={[styles.coin, { bottom: 0, right: 0, borderRightWidth: 4, borderBottomWidth: 4 }]} />
        </View>
      ) : (
        <View style={styles.refus}>
          <Texte style={{ color: '#ffffff', textAlign: 'center', lineHeight: 21 }}>{t('pa.camera_refus')}</Texte>
          <Bouton titre={t('pa.scanner')} icone="camera" onPress={demanderPermission} style={{ marginTop: 18, alignSelf: 'stretch' }} />
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
  refus: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
});
