// En-tête bleu nuit, avec retour et action de droite facultatifs.

import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { couleurs } from '../lib/theme';
import { Titre } from './ui';
import { useLangue } from '../lib/i18n';

export default function EnTete({ titre, retour, action, bas = 22, arrondi = true, children }) {
  const marges = useSafeAreaInsets();
  const { t } = useLangue();
  return (
    <View
      style={[
        styles.entete,
        arrondi && { borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
        { paddingTop: marges.top + 14, paddingBottom: bas },
      ]}
    >
      <View style={styles.halo} pointerEvents="none" />
      <View style={styles.ligne}>
        {retour ? (
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(onglets)'))}
            style={styles.rond}
            accessibilityRole="button"
            accessibilityLabel={t('gen.retour')}
            testID="retour"
          >
            <Feather name="arrow-left" size={20} color="#ffffff" />
          </Pressable>
        ) : null}
        <Titre taille={21} couleur="#ffffff" style={{ flex: 1 }} numberOfLines={1}>{titre}</Titre>
        {action}
      </View>
      {children}
    </View>
  );
}

export function RondEntete({ icone, onPress, etiquette, pastille }) {
  return (
    <Pressable onPress={onPress} style={styles.rond} accessibilityRole="button" accessibilityLabel={etiquette}>
      <Feather name={icone} size={19} color="#ffffff" />
      {pastille ? <View style={styles.pastille} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  entete: {
    backgroundColor: couleurs.nuit,
    paddingHorizontal: 18,
    overflow: 'hidden',
  },
  halo: {
    position: 'absolute',
    top: -90,
    right: -60,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(244,96,13,0.20)',
  },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rond: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: couleurs.voileClair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pastille: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: couleurs.accent,
    borderWidth: 2,
    borderColor: couleurs.nuit,
  },
});
