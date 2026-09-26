// Nos agences : adresse, horaires, itinéraire et appel.
// Une adresse pas encore connue (entre crochets dans config.js) n'est jamais montrée
// telle quelle : l'agence invite à appeler, sans itinéraire.

import { View, ScrollView, Pressable, Linking, Platform, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import config, { aCompleter } from '../config';
import EnTete from '../components/EnTete';
import { couleurs, rayons, ombres } from '../lib/theme';
import { Titre, Texte, Bouton } from '../components/ui';
import { useLangue } from '../lib/i18n';

function ouvrirCarte(recherche) {
  const requete = encodeURIComponent(recherche);
  const url = Platform.select({
    ios: `https://maps.apple.com/?q=${requete}`,
    android: `geo:0,0?q=${requete}`,
    default: `https://www.google.com/maps/search/?api=1&query=${requete}`,
  });
  Linking.openURL(url).catch(() => {});
}

export default function Agences() {
  const { t } = useLangue();

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <EnTete titre={t('ag.titre')} retour arrondi={false} bas={18} />

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 34, gap: 11 }}>
        {config.agences.map((a) => {
          const connue = !aCompleter(a.adresse);
          return (
            <View key={a.id} style={[styles.carte, ombres.carte]} testID={'agence-' + a.id}>
              <Titre taille={16}>{a.ville}</Titre>
              <Texte doux taille={13} style={{ marginTop: 7, lineHeight: 20 }}>
                {connue ? a.adresse : t('ag.adresse_inconnue')}
              </Texte>
              {!aCompleter(a.horaires) ? <Texte doux taille={12.5} style={{ marginTop: 4 }}>{a.horaires}</Texte> : null}
              <View style={{ flexDirection: 'row', gap: 9, marginTop: 13 }}>
                {connue ? (
                  <Bouton
                    titre={t('ag.itineraire')}
                    icone="navigation"
                    variante="sombre"
                    onPress={() => ouvrirCarte(a.carte)}
                    style={{ flex: 1, minHeight: 46 }}
                  />
                ) : null}
                <Pressable
                  onPress={() => Linking.openURL(`tel:${a.telephone}`).catch(() => {})}
                  style={[styles.rond, !connue && { flex: 1, flexDirection: 'row', gap: 8 }]}
                  accessibilityRole="button"
                  accessibilityLabel={t('ag.appeler') + ' ' + a.ville}
                >
                  <Feather name="phone" size={19} color={couleurs.texte} />
                  {!connue ? <Texte gras taille={14}>{t('ag.appeler')}</Texte> : null}
                </Pressable>
              </View>
            </View>
          );
        })}
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
    minWidth: 46,
    height: 46,
    borderRadius: rayons.champ,
    borderWidth: 1.5,
    borderColor: couleurs.bordFort,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
