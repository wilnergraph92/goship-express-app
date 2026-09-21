// Nos agences : adresse, horaires, itinéraire et appel.

import { View, ScrollView, Pressable, Linking, Platform, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import config from '../config';
import EnTete from '../components/EnTete';
import { couleurs, rayons, ombres } from '../lib/theme';
import { Titre, Texte, Bouton } from '../components/ui';
import { useLangue } from '../lib/i18n';

function ouvrirCarte(recherche) {
  const requete = encodeURIComponent(recherche);
  const url = Platform.select({
    ios: `http://maps.apple.com/?q=${requete}`,
    android: `geo:0,0?q=${requete}`,
    default: `https://www.google.com/maps/search/?api=1&query=${requete}`,
  });
  Linking.openURL(url);
}

export default function Agences() {
  const { t } = useLangue();

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <EnTete titre={t('ag.titre')} retour arrondi={false} bas={18} />

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 34, gap: 11 }}>
        {config.agences.map((a) => (
          <View key={a.id} style={[styles.carte, ombres.carte]}>
            <Titre taille={16}>{a.ville}</Titre>
            <Texte doux taille={13} style={{ marginTop: 7, lineHeight: 20 }}>{a.adresse}</Texte>
            <Texte doux taille={12.5} style={{ marginTop: 4 }}>{a.horaires}</Texte>
            <View style={{ flexDirection: 'row', gap: 9, marginTop: 13 }}>
              <Bouton
                titre={t('ag.itineraire')}
                icone="navigation"
                variante="sombre"
                onPress={() => ouvrirCarte(a.carte)}
                style={{ flex: 1, height: 46 }}
              />
              <Pressable
                onPress={() => Linking.openURL(`tel:${a.telephone}`)}
                style={styles.rond}
                accessibilityRole="button"
                accessibilityLabel={t('ag.appeler')}
              >
                <Feather name="phone" size={19} color={couleurs.texte} />
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  carte: {
    backgroundColor: couleurs.carte,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: couleurs.bord,
    padding: 16,
  },
  rond: {
    width: 46,
    height: 46,
    borderRadius: rayons.champ,
    borderWidth: 1.5,
    borderColor: couleurs.bordFort,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
