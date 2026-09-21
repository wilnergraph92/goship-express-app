// Briques visuelles réutilisées par tous les écrans.

import { Text, View, Pressable, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { couleurs, polices, rayons, ombres } from '../lib/theme';

export function Titre({ children, style, taille = 22, couleur = couleurs.texte }) {
  return <Text style={[{ fontFamily: polices.titre, fontSize: taille, color: couleur }, style]}>{children}</Text>;
}

export function Texte({ children, style, gras, doux, taille = 14.5 }) {
  return (
    <Text
      style={[
        {
          fontFamily: gras ? polices.corpsGras : polices.corps,
          fontSize: taille,
          color: doux ? couleurs.texteDoux : couleurs.texte,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Mono({ children, style, taille = 13, couleur = couleurs.texte }) {
  return (
    <Text style={[{ fontFamily: polices.monoGras, fontSize: taille, color: couleur, letterSpacing: 0.4 }, style]}>
      {children}
    </Text>
  );
}

export function Etiquette({ children, style, couleur = couleurs.texteFaible }) {
  return (
    <Text
      style={[
        { fontFamily: polices.mono, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: couleur },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Carte({ children, style }) {
  return <View style={[styles.carte, ombres.carte, style]}>{children}</View>;
}

export function Bouton({ titre, onPress, icone, variante = 'principal', occupe, style, desactive }) {
  const secondaire = variante === 'secondaire';
  const sombre = variante === 'sombre';
  const fond = secondaire ? couleurs.carte : sombre ? couleurs.nuit : couleurs.accent;
  const texte = secondaire ? couleurs.texte : '#ffffff';
  return (
    <Pressable
      onPress={desactive || occupe ? undefined : onPress}
      style={({ pressed }) => [
        styles.bouton,
        { backgroundColor: fond, opacity: desactive ? 0.5 : pressed ? 0.85 : 1 },
        secondaire && { borderWidth: 1.5, borderColor: couleurs.bordFort },
        !secondaire && !sombre && ombres.bouton,
        style,
      ]}
      accessibilityRole="button"
    >
      {occupe ? (
        <ActivityIndicator color={texte} />
      ) : (
        <>
          {icone ? <Feather name={icone} size={18} color={texte} style={{ marginRight: 9 }} /> : null}
          <Text style={{ fontFamily: polices.corpsTresGras, fontSize: 15.5, color: texte }}>{titre}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Champ({ etiquette, style, apres, ...reste }) {
  return (
    <View style={[{ gap: 7 }, style]}>
      {etiquette ? <Etiquette>{etiquette}</Etiquette> : null}
      <View style={styles.champBoite}>
        <TextInput
          placeholderTextColor={couleurs.texteFaible}
          style={styles.champ}
          {...reste}
        />
        {apres}
      </View>
    </View>
  );
}

export function Vide({ icone = 'package', titre, texte }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 30, gap: 12 }}>
      <View style={styles.videRond}>
        <Feather name={icone} size={30} color={couleurs.texteFaible} />
      </View>
      <Titre taille={17} style={{ textAlign: 'center' }}>{titre}</Titre>
      {texte ? <Texte doux taille={14} style={{ textAlign: 'center', lineHeight: 21 }}>{texte}</Texte> : null}
    </View>
  );
}

export function Chargement() {
  return (
    <View style={{ paddingVertical: 60, alignItems: 'center' }}>
      <ActivityIndicator color={couleurs.accent} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  carte: {
    backgroundColor: couleurs.carte,
    borderRadius: rayons.carte,
    borderWidth: 1,
    borderColor: couleurs.bord,
    padding: 17,
  },
  bouton: {
    height: 54,
    borderRadius: rayons.bouton,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  champBoite: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bord,
    borderRadius: rayons.champ,
    paddingRight: 6,
  },
  champ: {
    flex: 1,
    height: 54,
    paddingHorizontal: 16,
    fontFamily: polices.corps,
    fontSize: 15.5,
    color: couleurs.texte,
  },
  videRond: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: '#eef2f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
