// « Continuer avec Google » : fond blanc, bordure, logo en couleurs à gauche du texte,
// comme le demandent les règles de Google pour ses boutons de connexion.

import { Pressable, Image, ActivityIndicator, Text } from 'react-native';
import { couleurs, rayons, polices } from '../lib/theme';

export default function BoutonGoogle({ titre, onPress, occupe, testID }) {
  return (
    <Pressable
      onPress={occupe ? undefined : onPress}
      style={({ pressed }) => ({
        minHeight: 54,
        borderRadius: rayons.bouton,
        borderWidth: 1.5,
        borderColor: couleurs.bordFort,
        backgroundColor: pressed ? couleurs.fond : couleurs.carte,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingHorizontal: 18,
      })}
      accessibilityRole="button"
      accessibilityLabel={titre}
      accessibilityState={{ disabled: !!occupe, busy: !!occupe }}
      testID={testID}
    >
      {occupe ? (
        <ActivityIndicator color={couleurs.texte} />
      ) : (
        <>
          <Image source={require('../assets/google-g.png')} style={{ width: 20, height: 20 }} accessibilityIgnoresInvertColors />
          <Text style={{ fontFamily: polices.corpsTresGras, fontSize: 15.5, color: '#1f1f1f' }} numberOfLines={1}>{titre}</Text>
        </>
      )}
    </Pressable>
  );
}
