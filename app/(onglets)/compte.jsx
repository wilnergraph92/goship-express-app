// Mon compte : code client, réglages, langue, notifications, aide et déconnexion.

import { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, Linking, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { Feather } from '@expo/vector-icons';
import config from '../../config';
import { couleurs, rayons, ombres, polices } from '../../lib/theme';
import { Titre, Texte, Mono, Etiquette } from '../../components/ui';
import { useLangue, LANGUES } from '../../lib/i18n';
import { useSession } from '../../lib/session';
import { majProfil } from '../../lib/api';
import { activerNotifications, etatNotifications, surEtatNotifications } from '../../lib/notifications';

// « 1.0.0 (3) » : la version affichée dans les boutiques, et le numéro de build
function version() {
  const e = Constants.expoConfig || {};
  const build = (e.ios && e.ios.buildNumber) || (e.android && e.android.versionCode);
  return (e.version || '') + (build ? ` (${build})` : '');
}

export default function Compte() {
  const { t, langue, changerLangue } = useLangue();
  const { profil, deconnexion, rafraichirProfil } = useSession();
  const marges = useSafeAreaInsets();
  const [choixLangue, setChoixLangue] = useState(false);
  const [confirmer, setConfirmer] = useState(false);
  const [notif, setNotif] = useState(etatNotifications());
  const [details, setDetails] = useState(false);

  useEffect(() => surEtatNotifications(setNotif), []);

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

  // Refusées : seul le réglage du téléphone peut les rouvrir ; sinon, on (re)demande
  function notifications() {
    if (notif === 'refusee') Linking.openSettings().catch(() => {});
    else if (notif === 'inconnue' || notif === 'erreur') activerNotifications(langue).catch(() => {});
  }

  async function seDeconnecter() {
    await deconnexion();
    router.replace('/connexion');
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
            <Texte taille={12.5} style={{ color: couleurs.surNuit }} numberOfLines={1} testID="compte-email">{profil?.email || ''}</Texte>
          </View>
        </View>

        {profil?.code ? (
          <View style={styles.boiteCode}>
            <View style={{ gap: 3 }}>
              <Etiquette couleur={couleurs.surNuit}>{t('cp.code')}</Etiquette>
              <Mono taille={15} couleur="#ffffff">{profil.code}</Mono>
            </View>
            <Pressable
              onPress={() => Clipboard.setStringAsync(profil.code)}
              style={styles.rondClair}
              accessibilityRole="button"
              accessibilityLabel={t('gen.copier') + ' ' + t('cp.code')}
            >
              <Feather name="copy" size={18} color="#ffffff" />
            </Pressable>
          </View>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 30 }}>
        <View style={[styles.liste, ombres.carte]}>
          <Ligne icone="user" titre={t('cp.infos')} onPress={() => setDetails((v) => !v)} ouvert={details} />
          {details ? (
            <View style={{ paddingHorizontal: 16, paddingBottom: 14, gap: 4 }}>
              {[profil?.nom_complet, profil?.email, profil?.telephone, [profil?.adresse, profil?.ville, profil?.pays].filter(Boolean).join(', ')]
                .filter(Boolean).map((l, i) => <Texte key={i} doux taille={13.5}>{l}</Texte>)}
            </View>
          ) : null}
          <Ligne icone="bell" titre={t('cp.notifications')} valeur={t('cp.notif.' + notif)} onPress={notifications} id="compte-notifications" />
          <Ligne icone="globe" titre={t('cp.langue')} valeur={LANGUES.find((l) => l.code === langue)?.nom} onPress={() => setChoixLangue((v) => !v)} ouvert={choixLangue} />
          {choixLangue ? (
            <View style={{ paddingHorizontal: 16, paddingBottom: 14, gap: 8 }}>
              {LANGUES.map((l) => (
                <Pressable
                  key={l.code}
                  onPress={() => poserLangue(l.code)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: langue === l.code }}
                  style={[styles.choix, langue === l.code && { backgroundColor: couleurs.accentDoux, borderColor: couleurs.accent }]}
                  testID={'langue-' + l.code}
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
            onPress={() => Linking.openURL(`https://wa.me/${config.whatsapp}`).catch(() => {})}
          />
          <Ligne icone="shield" titre={t('cp.confidentialite')} onPress={() => Linking.openURL(config.siteUrl + 'confidentialite.html').catch(() => {})} />
          <Ligne icone="user-x" titre={t('cp.fermer')} onPress={() => Linking.openURL(config.siteUrl + 'fermer-un-compte.html').catch(() => {})} dernier />
        </View>

        {confirmer ? (
          <View style={[styles.confirmer, ombres.carte]}>
            <Texte gras taille={14.5} style={{ textAlign: 'center' }}>{t('cp.deconnexion')} ?</Texte>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <Pressable onPress={() => setConfirmer(false)} style={[styles.bouton, { borderColor: couleurs.bordFort }]} accessibilityRole="button">
                <Texte gras taille={14}>{t('gen.annuler')}</Texte>
              </Pressable>
              <Pressable onPress={seDeconnecter} style={[styles.bouton, { borderColor: '#f3d3cb', backgroundColor: 'rgba(192,57,43,0.08)' }]}
                accessibilityRole="button" testID="compte-deconnexion-oui">
                <Texte gras taille={14} style={{ color: couleurs.rouge }}>{t('cp.deconnexion')}</Texte>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={() => setConfirmer(true)} style={styles.deconnexion} accessibilityRole="button" testID="compte-deconnexion">
            <Feather name="log-out" size={18} color={couleurs.rouge} />
            <Texte gras taille={14.5} style={{ color: couleurs.rouge }}>{t('cp.deconnexion')}</Texte>
          </Pressable>
        )}

        <Texte doux taille={11.5} style={{ textAlign: 'center', marginTop: 14 }} testID="compte-version">
          GoShip Express · {t('cp.version')} {version()}{config.environnement !== 'production' ? ` · ${config.environnement}` : ''}
        </Texte>
      </ScrollView>
    </View>
  );
}

function Ligne({ icone, titre, valeur, onPress, dernier, ouvert, id }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={valeur ? `${titre}, ${valeur}` : titre}
      accessibilityState={ouvert === undefined ? undefined : { expanded: !!ouvert }}
      style={({ pressed }) => [styles.ligne, !dernier && styles.ligneBord, pressed && { backgroundColor: '#f7f9fd' }]}
      testID={id}
    >
      <View style={styles.ligneRond}>
        <Feather name={icone} size={18} color={couleurs.texte} />
      </View>
      <Texte gras taille={14.5} style={{ flex: 1 }}>{titre}</Texte>
      {valeur ? <Texte doux gras taille={13} numberOfLines={2} style={{ maxWidth: 150, textAlign: 'right' }}>{valeur}</Texte> : null}
      <Feather name={ouvert ? 'chevron-down' : 'chevron-right'} size={17} color={couleurs.texteFaible} />
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
  rondClair: { width: 44, height: 44, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  liste: { backgroundColor: couleurs.carte, borderRadius: rayons.carte, borderWidth: 1, borderColor: couleurs.bord, overflow: 'hidden' },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 16, paddingVertical: 15, minHeight: 56 },
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
    minHeight: 52,
    marginTop: 14,
    borderRadius: rayons.bouton,
    borderWidth: 1.5,
    borderColor: '#f3d3cb',
    backgroundColor: couleurs.carte,
  },
  confirmer: { marginTop: 14, padding: 16, borderRadius: rayons.carte, backgroundColor: couleurs.carte, borderWidth: 1, borderColor: couleurs.bord },
  bouton: { flex: 1, minHeight: 48, borderRadius: rayons.bouton, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
