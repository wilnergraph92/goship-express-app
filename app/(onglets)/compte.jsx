// Mon compte : code client, réglages, langue, aide et déconnexion.

import { useState } from 'react';
import { View, ScrollView, Pressable, Linking, Alert, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Feather } from '@expo/vector-icons';
import config from '../../config';
import { couleurs, rayons, ombres, polices } from '../../lib/theme';
import { Titre, Texte, Mono, Etiquette } from '../../components/ui';
import { useLangue, LANGUES } from '../../lib/i18n';
import { useSession } from '../../lib/session';
import { majProfil } from '../../lib/api';

export default function Compte() {
  const { t, langue, changerLangue } = useLangue();
  const { profil, deconnexion, rafraichirProfil } = useSession();
  const marges = useSafeAreaInsets();
  const [choixLangue, setChoixLangue] = useState(false);

  const initiales = (profil?.nom_complet || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0].toUpperCase())
    .join('');

  async function poserLangue(code) {
    changerLangue(code);
    setChoixLangue(false);
    if (profil?.id) {
      try { await majProfil(profil.id, { langue: code }); await rafraichirProfil(); } catch (e) { /* sans effet sur l'affichage */ }
    }
  }

  function seDeconnecter() {
    Alert.alert('GoShip Express', t('cp.deconnexion'), [
      { text: t('gen.annuler'), style: 'cancel' },
      {
        text: t('cp.deconnexion'),
        style: 'destructive',
        onPress: async () => { await deconnexion(); router.replace('/connexion'); },
      },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <View style={[styles.entete, { paddingTop: marges.top + 16 }]}>
        <View style={styles.halo} pointerEvents="none" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={styles.avatar}>
            <Texte style={{ fontFamily: polices.titre, fontSize: 21, color: '#ffffff' }}>{initiales || '·'}</Texte>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Titre taille={20} couleur="#ffffff" numberOfLines={1}>{profil?.nom_complet || ''}</Titre>
            <Texte taille={12.5} style={{ color: couleurs.surNuit }} numberOfLines={1}>{profil?.email || ''}</Texte>
          </View>
        </View>

        <View style={styles.boiteCode}>
          <View style={{ gap: 3 }}>
            <Etiquette couleur={couleurs.surNuit}>{t('cp.code')}</Etiquette>
            <Mono taille={15} couleur="#ffffff">{profil?.code || '—'}</Mono>
          </View>
          <Pressable
            onPress={() => Clipboard.setStringAsync(profil?.code || '')}
            style={styles.rondClair}
            accessibilityRole="button"
            accessibilityLabel={t('gen.copier')}
          >
            <Feather name="copy" size={18} color="#ffffff" />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 30 }}>
        <View style={[styles.liste, ombres.carte]}>
          <Ligne icone="user" titre={t('cp.infos')} onPress={() => Alert.alert('GoShip Express', profil?.nom_complet || '')} />
          <Ligne
            icone="map-pin"
            titre={t('cp.adresse_livraison')}
            valeur={[profil?.ville, profil?.pays].filter(Boolean).join(', ')}
            onPress={() => Alert.alert('GoShip Express', [profil?.adresse, profil?.ville, profil?.pays].filter(Boolean).join('\n') || '—')}
          />
          <Ligne icone="bell" titre={t('cp.notifications')} valeur={t('cp.notifications_texte')} onPress={() => Linking.openSettings()} />
          <Ligne icone="globe" titre={t('cp.langue')} valeur={LANGUES.find((l) => l.code === langue)?.nom} onPress={() => setChoixLangue((v) => !v)} />
          {choixLangue ? (
            <View style={{ paddingHorizontal: 16, paddingBottom: 14, gap: 8 }}>
              {LANGUES.map((l) => (
                <Pressable
                  key={l.code}
                  onPress={() => poserLangue(l.code)}
                  accessibilityRole="button"
                  style={[styles.choix, langue === l.code && { backgroundColor: couleurs.accentDoux, borderColor: couleurs.accent }]}
                >
                  <Texte gras taille={14}>{l.nom}</Texte>
                  {langue === l.code ? <Feather name="check" size={17} color={couleurs.accent} /> : null}
                </Pressable>
              ))}
            </View>
          ) : null}
          <Ligne icone="home" titre={t('cp.agences')} onPress={() => router.push('/agences')} />
          <Ligne
            icone="message-circle"
            titre={t('cp.aide')}
            onPress={() => Linking.openURL(`https://wa.me/${config.whatsapp}`)}
            dernier
          />
        </View>

        <Pressable onPress={seDeconnecter} style={styles.deconnexion} accessibilityRole="button">
          <Feather name="log-out" size={18} color={couleurs.rouge} />
          <Texte gras taille={14.5} style={{ color: couleurs.rouge }}>{t('cp.deconnexion')}</Texte>
        </Pressable>

        <Texte doux taille={11.5} style={{ textAlign: 'center', marginTop: 14 }}>GoShip Express · version 1.0</Texte>
      </ScrollView>
    </View>
  );
}

function Ligne({ icone, titre, valeur, onPress, dernier }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.ligne, !dernier && styles.ligneBord, pressed && { backgroundColor: '#f7f9fd' }]}
    >
      <View style={styles.ligneRond}>
        <Feather name={icone} size={18} color={couleurs.texte} />
      </View>
      <Texte gras taille={14.5} style={{ flex: 1 }}>{titre}</Texte>
      {valeur ? <Texte doux gras taille={13} numberOfLines={1} style={{ maxWidth: 140 }}>{valeur}</Texte> : null}
      <Feather name="chevron-right" size={17} color={couleurs.texteFaible} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  entete: {
    backgroundColor: couleurs.nuit,
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  halo: { position: 'absolute', top: -80, right: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(244,96,13,0.18)' },
  avatar: { width: 58, height: 58, borderRadius: 20, backgroundColor: couleurs.accent, alignItems: 'center', justifyContent: 'center' },
  boiteCode: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 16,
    padding: 12,
    borderRadius: 16,
    backgroundColor: couleurs.voileClair,
  },
  rondClair: { width: 42, height: 42, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  liste: { backgroundColor: couleurs.carte, borderRadius: rayons.carte, borderWidth: 1, borderColor: couleurs.bord, overflow: 'hidden' },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 16, paddingVertical: 15 },
  ligneBord: { borderBottomWidth: 1, borderBottomColor: '#f1f4fa' },
  ligneRond: { width: 38, height: 38, borderRadius: 13, backgroundColor: '#f3f6fc', alignItems: 'center', justifyContent: 'center' },
  choix: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: couleurs.bord,
  },
  deconnexion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    marginTop: 14,
    borderRadius: rayons.bouton,
    borderWidth: 1.5,
    borderColor: '#f3d3cb',
    backgroundColor: couleurs.carte,
  },
});
