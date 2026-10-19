// Mon adresse aux États-Unis : les huit champs de l'adresse de réception, tels que les
// formulaires des magasins (Amazon, SHEIN, Temu, Alibaba, AliExpress, Zara…) les demandent,
// chacun copiable à part, et l'adresse complète en un geste.
//
// Aucune donnée n'est lue ici hors du profil connecté : le nom et le code viennent du compte
// (lib/adresse.js), le reste de config.js, identique pour tous. Sans nom ou sans code, on ne
// compose rien et on le dit, plutôt que de montrer une adresse qui ferait perdre un colis.

import { useState } from 'react';
import { View, ScrollView, Pressable, Share, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Feather } from '@expo/vector-icons';
import config from '../config';
import EnTete from '../components/EnTete';
import { Texte, Mono, Etiquette, Bouton } from '../components/ui';
import { couleurs, rayons, ombres } from '../lib/theme';
import { useLangue } from '../lib/i18n';
import { useSession } from '../lib/session';
import { champsAdresse, champsFixes, adresseTexte } from '../lib/adresse';

export default function Adresse() {
  const { t } = useLangue();
  const { profil } = useSession();
  // Ce qui vient d'être copié : 'tout' ou la clé d'un champ (une confirmation à la fois)
  const [copie, setCopie] = useState(null);

  const champs = champsAdresse(profil, config.adresseMiami);

  async function copier(cle, texte) {
    try {
      await Clipboard.setStringAsync(texte);
      setCopie(cle);
      setTimeout(() => setCopie((c) => (c === cle ? null : c)), 1800);
    } catch (e) {
      setCopie(null);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <EnTete titre={t('ad.titre')} retour>
        <Texte taille={12.5} style={{ marginTop: 12, color: couleurs.surNuit, lineHeight: 19 }}>{t('ad.intro')}</Texte>
      </EnTete>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40, gap: 14 }}>
        {!champs ? (
          <View style={styles.manquante} accessibilityLiveRegion="polite" testID="adresse-manquante">
            <Feather name="alert-circle" size={18} color={couleurs.rouge} />
            <Texte taille={13.5} style={{ flex: 1, lineHeight: 19 }}>{t('ad.manquante')}</Texte>
          </View>
        ) : null}

        <View style={[styles.carte, ombres.carte]} testID="adresse-champs">
          {(champs || [{ cle: 'name', libelle: 'Name', valeur: '—' }, ...champsFixes(config.adresseMiami)]).map((c, i, tous) => (
            <View key={c.cle} style={[styles.ligne, i === tous.length - 1 ? { borderBottomWidth: 0 } : null]}>
              <View style={{ flex: 1, gap: 3 }}>
                <Etiquette>{c.libelle}</Etiquette>
                <Texte gras taille={14.5} style={{ lineHeight: 20 }} selectable testID={'adresse-' + c.cle}>{c.valeur}</Texte>
              </View>
              <Pressable
                onPress={() => copier(c.cle, c.valeur)}
                disabled={!champs}
                style={[styles.copier, !champs ? { opacity: 0.35 } : null]}
                accessibilityRole="button"
                accessibilityLabel={`${t('gen.copier')} ${c.libelle}`}
                testID={'adresse-copier-' + c.cle}
              >
                <Feather name={copie === c.cle ? 'check' : 'copy'} size={18} color={copie === c.cle ? couleurs.vert : couleurs.accent} />
              </Pressable>
            </View>
          ))}
        </View>

        <Texte doux taille={13} style={{ lineHeight: 19 }}>{t('ad.note')}</Texte>

        <View style={{ flexDirection: 'row', gap: 9 }}>
          <Bouton
            titre={copie === 'tout' ? t('ad.copiee') : t('ad.copier_tout')}
            icone={copie === 'tout' ? 'check' : 'copy'}
            onPress={() => copier('tout', adresseTexte(profil, config.adresseMiami))}
            desactive={!champs}
            style={{ flex: 1, minHeight: 50 }}
            testID="adresse-copier-tout"
          />
          <Bouton
            titre={t('gen.partager')}
            icone="share-2"
            variante="secondaire"
            onPress={() => Share.share({ message: adresseTexte(profil, config.adresseMiami) })}
            desactive={!champs}
            style={{ minHeight: 50 }}
            testID="adresse-partager"
          />
        </View>
        {copie ? (
          <View accessibilityLiveRegion="polite" testID="adresse-confirmation" style={{ alignItems: 'center' }}>
            <Mono taille={11} couleur={couleurs.vert}>{t('ad.copiee')} ✓</Mono>
          </View>
        ) : null}
        <Pressable onPress={() => router.back()} style={{ alignItems: 'center', paddingVertical: 8 }} accessibilityRole="button">
          <Texte gras doux taille={14}>{t('gen.fermer')}</Texte>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  carte: {
    backgroundColor: couleurs.carte,
    borderRadius: rayons.carte,
    borderWidth: 1,
    borderColor: couleurs.bord,
    overflow: 'hidden',
  },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bord,
  },
  copier: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  manquante: {
    flexDirection: 'row', gap: 10, alignItems: 'center', padding: 13, borderRadius: 14,
    backgroundColor: 'rgba(192,57,43,0.07)',
  },
});
