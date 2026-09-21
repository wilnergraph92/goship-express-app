// Accueil : adresse de Miami, colis en cours, derniers mouvements.

import { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, Image, Pressable, RefreshControl, Share, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Feather } from '@expo/vector-icons';
import config from '../../config';
import { couleurs, polices, rayons, ombres } from '../../lib/theme';
import { Titre, Texte, Mono, Etiquette, Bouton, Chargement, Vide } from '../../components/ui';
import { CarteColis } from '../../components/colis';
import { useLangue } from '../../lib/i18n';
import { useSession } from '../../lib/session';
import { mesColis, surveillerColis } from '../../lib/api';

function adresseComplete(profil) {
  const a = config.adresseMiami;
  return [
    [profil?.nom_complet || '', profil?.code || ''].filter(Boolean).join(' '),
    a.ligne1,
    a.ligne2,
    a.ligne3,
    a.pays,
  ].filter(Boolean).join('\n');
}

export default function Accueil() {
  const { t, langue } = useLangue();
  const { profil } = useSession();
  const marges = useSafeAreaInsets();

  const [colis, setColis] = useState(null);
  const [rafraichit, setRafraichit] = useState(false);
  const [copie, setCopie] = useState(false);

  const charger = useCallback(async () => {
    try {
      setColis(await mesColis());
    } catch (e) {
      setColis([]);
    }
  }, []);

  useFocusEffect(useCallback(() => { charger(); }, [charger]));

  useEffect(() => {
    if (!profil?.id) return undefined;
    return surveillerColis(profil.id, charger);
  }, [profil?.id, charger]);

  const enRoute = (colis || []).filter((c) => ['recu', 'emballe', 'embarque', 'distribution', 'succursale'].includes(c.statut)).length;
  const aRetirer = (colis || []).filter((c) => c.statut === 'disponible').length;
  const derniers = (colis || []).slice(0, 2);

  async function copier() {
    await Clipboard.setStringAsync(adresseComplete(profil));
    setCopie(true);
    setTimeout(() => setCopie(false), 1800);
  }

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <View style={[styles.entete, { paddingTop: marges.top + 16 }]}>
        <View style={styles.halo} pointerEvents="none" />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Image source={require('../../assets/logo-goship-blanc.png')} style={{ width: 108, height: 27 }}
            resizeMode="contain" accessibilityLabel="GoShip Express" />
          <Pressable
            onPress={() => router.push('/(onglets)/colis')}
            style={styles.rond}
            accessibilityRole="button"
            accessibilityLabel={t('cp.notifications')}
          >
            <Feather name="bell" size={19} color="#ffffff" />
            {aRetirer > 0 ? <View style={styles.pastille} /> : null}
          </Pressable>
        </View>

        <Texte taille={13} style={{ marginTop: 20, color: couleurs.surNuit }}>{t('ac.bonjour')}</Texte>
        <Titre taille={25} couleur="#ffffff" style={{ marginTop: 3 }} numberOfLines={1}>
          {profil?.nom_complet || ''}
        </Titre>
        {profil?.code ? (
          <View style={styles.puceCode}>
            <Feather name="user" size={13} color={couleurs.accent} />
            <Mono taille={12} couleur="#ffffff">{profil.code}</Mono>
          </View>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={
          <RefreshControl
            refreshing={rafraichit}
            onRefresh={async () => { setRafraichit(true); await charger(); setRafraichit(false); }}
            tintColor={couleurs.accent}
          />
        }
      >
        <View style={[styles.carteAdresse, ombres.carte]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Etiquette>{t('ac.adresse')}</Etiquette>
            <Feather name="map-pin" size={16} color={couleurs.accent} />
          </View>
          <Texte gras taille={14} style={{ marginTop: 9, lineHeight: 21 }}>{adresseComplete(profil)}</Texte>
          <View style={{ flexDirection: 'row', gap: 9, marginTop: 14 }}>
            <Bouton
              titre={copie ? t('gen.copie') : t('gen.copier')}
              icone={copie ? 'check' : 'copy'}
              onPress={copier}
              style={{ flex: 1, height: 46 }}
            />
            <Bouton
              titre={t('gen.partager')}
              icone="share-2"
              variante="secondaire"
              onPress={() => Share.share({ message: adresseComplete(profil) })}
              style={{ height: 46 }}
            />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 11, marginHorizontal: 18, marginTop: 14 }}>
          <Stat nombre={enRoute} texte={t('ac.en_route')} icone="send" couleur={couleurs.bleu} />
          <Stat nombre={aRetirer} texte={t('ac.a_retirer')} icone="package" couleur={couleurs.accent} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginHorizontal: 18, marginTop: 20 }}>
          <Titre taille={17}>{t('ac.derniers')}</Titre>
          <Pressable onPress={() => router.push('/(onglets)/colis')} accessibilityRole="button">
            <Texte gras taille={13} style={{ color: couleurs.accent }}>{t('ac.tout_voir')}</Texte>
          </Pressable>
        </View>

        {colis === null ? (
          <Chargement />
        ) : derniers.length === 0 ? (
          <Vide titre={t('co.vide')} texte={t('co.vide_texte')} />
        ) : (
          <View style={{ gap: 11, marginHorizontal: 18, marginTop: 11 }}>
            {derniers.map((c) => <CarteColis key={c.id} colis={c} />)}
          </View>
        )}

        <Pressable
          onPress={() => router.push('/(onglets)/prealerte')}
          style={styles.bandePrealerte}
          accessibilityRole="button"
        >
          <View style={styles.rondPrealerte}>
            <Feather name="bell" size={19} color="#ff8b45" />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Texte gras taille={14} style={{ color: '#ffffff' }}>{t('ac.prealerte_titre')}</Texte>
            <Texte taille={12.5} style={{ color: couleurs.surNuit }}>{t('ac.prealerte_texte')}</Texte>
          </View>
          <Feather name="chevron-right" size={20} color="#ffffff" />
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Stat({ nombre, texte, icone, couleur }) {
  return (
    <View style={[styles.stat, ombres.carte]}>
      <View style={[styles.statRond, { backgroundColor: couleur + '22' }]}>
        <Feather name={icone} size={18} color={couleur} />
      </View>
      <View>
        <Texte style={{ fontFamily: polices.titre, fontSize: 19 }}>{nombre}</Texte>
        <Texte doux taille={12}>{texte}</Texte>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  entete: {
    backgroundColor: couleurs.nuit,
    paddingHorizontal: 22,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  halo: { position: 'absolute', top: -70, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(244,96,13,0.20)' },
  rond: { width: 44, height: 44, borderRadius: 14, backgroundColor: couleurs.voileClair, alignItems: 'center', justifyContent: 'center' },
  pastille: { position: 'absolute', top: 9, right: 10, width: 9, height: 9, borderRadius: 5, backgroundColor: couleurs.accent, borderWidth: 2, borderColor: couleurs.nuit },
  puceCode: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 11,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: rayons.pastille,
    backgroundColor: couleurs.voileClair,
  },
  carteAdresse: {
    marginHorizontal: 18,
    marginTop: -20,
    backgroundColor: couleurs.carte,
    borderRadius: rayons.carte,
    borderWidth: 1,
    borderColor: couleurs.bord,
    padding: 17,
  },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: couleurs.carte,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: couleurs.bord,
    padding: 13,
  },
  statRond: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  bandePrealerte: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginHorizontal: 18,
    marginTop: 13,
    padding: 14,
    borderRadius: 20,
    backgroundColor: couleurs.nuit,
  },
  rondPrealerte: { width: 38, height: 38, borderRadius: 13, backgroundColor: 'rgba(244,96,13,0.20)', alignItems: 'center', justifyContent: 'center' },
});
