// Accueil : adresse de Miami, colis en cours, action requise, solde, derniers colis et
// derniers messages, suivi rapide.
//
// Tous les chiffres viennent de la base (mon_resume, la même fonction que l'espace
// client du site) : l'application ne compte ni n'additionne rien elle-même.

import { useCallback, useEffect, useRef, useState } from 'react';
import { View, ScrollView, Image, Pressable, RefreshControl, Share, TextInput, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Feather } from '@expo/vector-icons';
import config from '../../config';
import { couleurs, polices, rayons, ombres } from '../../lib/theme';
import { Titre, Texte, Mono, Etiquette, Bouton, Chargement, Vide, EtatErreur, Bandeau } from '../../components/ui';
import { CarteColis } from '../../components/colis';
import { useLangue } from '../../lib/i18n';
import { useSession } from '../../lib/session';
import { useDonnees } from '../../lib/useDonnees';
import { mesColis, monResume, notificationsNonLues, surveiller } from '../../lib/api';
import { dateRelative, montant, libelleStatut } from '../../lib/format';

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

const STATUTS_CONNUS = ['recu', 'emballe', 'embarque', 'distribution', 'succursale', 'disponible', 'livre', 'incident'];

export default function Accueil() {
  const { t, langue } = useLangue();
  const { profil, equipe } = useSession();
  const marges = useSafeAreaInsets();
  const [copie, setCopie] = useState(false);
  const [numero, setNumero] = useState('');
  const premier = useRef(true);

  const { donnees, erreur, recharger, rafraichit, tirer, chargement } = useDonnees(async () => {
    // Le badge des notifications est compté par la base ; une base sans la Phase 11
    // n'en a pas, et la cloche n'affiche alors aucun chiffre (rien d'inventé)
    const [resume, derniers, nonLues] = await Promise.all([
      monResume(), mesColis({ parPage: 3 }), notificationsNonLues().catch(() => null)]);
    return { resume, derniers: derniers.lignes, nonLues };
  }, []);

  // À chaque retour sur l'accueil, et à chaque changement fait par l'équipe
  useFocusEffect(useCallback(() => {
    if (premier.current) { premier.current = false; return; }
    recharger();
  }, [recharger]));
  useEffect(() => surveiller(profil?.id, recharger), [profil?.id, recharger]);

  const resume = donnees?.resume;
  const c = resume?.colis || {};
  const f = config.modules.factures ? resume?.factures : null;
  const messages = (resume?.notifications || []).slice(0, 3);

  async function copier() {
    await Clipboard.setStringAsync(adresseComplete(profil));
    setCopie(true);
    setTimeout(() => setCopie(false), 1800);
  }

  function suivre() {
    const n = numero.trim();
    if (n.length < 4) return;
    router.push({ pathname: '/suivi', params: { numero: n } });
  }

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <View style={[styles.entete, { paddingTop: marges.top + 16 }]}>
        <View style={styles.halo} pointerEvents="none" />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Image source={require('../../assets/logo-goship-blanc.png')} style={{ width: 108, height: 27 }}
            resizeMode="contain" accessibilityLabel="GoShip Express" />
          <View style={{ flexDirection: 'row', gap: 9 }}>
            <Pressable
              onPress={() => router.push('/notifications')}
              style={styles.rond}
              accessibilityRole="button"
              accessibilityLabel={t('no.titre') + (donnees?.nonLues ? ', ' + t('no.non_lues', { n: donnees.nonLues }) : '')}
              testID="accueil-notifs"
            >
              <Feather name="bell" size={19} color="#ffffff" />
              {donnees?.nonLues > 0 ? (
                <View style={styles.badge} testID="accueil-notifs-badge">
                  <Texte gras taille={10.5} style={{ color: '#ffffff' }}>{donnees.nonLues > 99 ? '99+' : donnees.nonLues}</Texte>
                </View>
              ) : null}
            </Pressable>
            <Pressable
              onPress={() => router.push('/(onglets)/colis')}
              style={styles.rond}
              accessibilityRole="button"
              accessibilityLabel={t('co.titre')}
            >
              <Feather name="package" size={19} color="#ffffff" />
              {c.disponibles > 0 || c.action_requise > 0 ? <View style={styles.pastille} /> : null}
            </Pressable>
          </View>
        </View>

        <Texte taille={13} style={{ marginTop: 20, color: couleurs.surNuit }}>{t('ac.bonjour')}</Texte>
        <Titre taille={25} couleur="#ffffff" style={{ marginTop: 3 }} numberOfLines={1} testID="accueil-nom">
          {profil?.nom_complet || ''}
        </Titre>
        {profil?.code ? (
          <View style={styles.puceCode}>
            <Feather name="user" size={13} color={couleurs.accent} />
            <Mono taille={12} couleur="#ffffff" testID="accueil-code">{profil.code}</Mono>
          </View>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 30 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={rafraichit} onRefresh={tirer} tintColor={couleurs.accent} />}
      >
        {equipe ? (
          <View style={[styles.carteAdresse, ombres.carte]} testID="accueil-equipe">
            <Texte taille={13.5} style={{ lineHeight: 20 }}>{t('ac.equipe')}</Texte>
          </View>
        ) : (
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
                style={{ flex: 1, minHeight: 46 }}
              />
              <Bouton
                titre={t('gen.partager')}
                icone="share-2"
                variante="secondaire"
                onPress={() => Share.share({ message: adresseComplete(profil) })}
                style={{ minHeight: 46 }}
              />
            </View>
          </View>
        )}

        {donnees ? <Bandeau erreur={erreur} onReessayer={recharger} /> : null}

        {chargement ? (
          <Chargement />
        ) : !donnees ? (
          <EtatErreur erreur={erreur} onReessayer={recharger} />
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 11, marginHorizontal: 18, marginTop: 14 }}>
              <Stat nombre={c.en_cours} texte={t('ac.en_route')} icone="send" couleur={couleurs.bleu} id="stat-en-cours"
                onPress={() => router.push('/(onglets)/colis')} />
              <Stat nombre={c.disponibles} texte={t('ac.a_retirer')} icone="package" couleur={couleurs.accent} id="stat-disponibles"
                onPress={() => router.push('/(onglets)/colis')} />
            </View>
            {c.action_requise > 0 ? (
              <Pressable onPress={() => router.push('/(onglets)/colis')} style={styles.alerte} accessibilityRole="button" testID="stat-action">
                <Feather name="alert-triangle" size={18} color={couleurs.rouge} />
                <Texte gras taille={13.5} style={{ flex: 1, color: '#8f1d1d' }}>
                  {c.action_requise} {t('ac.action_requise')}
                </Texte>
                <Feather name="chevron-right" size={18} color="#8f1d1d" />
              </Pressable>
            ) : null}

            {f ? (
              <Pressable onPress={() => router.push('/(onglets)/factures')} style={[styles.carteSolde, ombres.carte]}
                accessibilityRole="button" testID="accueil-solde">
                <View style={{ flex: 1, gap: 3 }}>
                  <Etiquette>{t('ac.solde')}</Etiquette>
                  <Titre taille={22} testID="accueil-solde-montant">{montant(f.solde_usd, langue)}</Titre>
                  <Texte doux taille={12.5}>
                    {Number(f.solde_usd) > 0
                      ? (Number(f.montant_en_retard) > 0 ? t('ac.en_retard', { montant: montant(f.montant_en_retard, langue) }) : '')
                      : t('ac.a_jour')}
                  </Texte>
                </View>
                <Feather name="chevron-right" size={20} color={couleurs.texteFaible} />
              </Pressable>
            ) : null}

            <View style={[styles.suivre, ombres.carte]}>
              <Etiquette>{t('ac.suivre_titre')}</Etiquette>
              <View style={{ flexDirection: 'row', gap: 9, marginTop: 9 }}>
                <TextInput
                  value={numero}
                  onChangeText={setNumero}
                  onSubmitEditing={suivre}
                  placeholder={t('ac.suivre')}
                  placeholderTextColor={couleurs.texteFaible}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="search"
                  style={styles.champSuivi}
                  accessibilityLabel={t('ac.suivre_titre')}
                  testID="accueil-suivi"
                />
                <Pressable onPress={suivre} style={styles.boutonSuivi} accessibilityRole="button"
                  accessibilityLabel={t('ac.suivre_titre')} testID="accueil-suivi-ok">
                  <Feather name="search" size={20} color="#ffffff" />
                </Pressable>
              </View>
            </View>

            <View style={styles.ligneTitre}>
              <Titre taille={17}>{t('ac.derniers')}</Titre>
              <Pressable onPress={() => router.push('/(onglets)/colis')} accessibilityRole="button" hitSlop={10}>
                <Texte gras taille={13} style={{ color: couleurs.accent }}>{t('ac.tout_voir')}</Texte>
              </Pressable>
            </View>
            {donnees.derniers.length === 0 ? (
              <Vide titre={t('co.vide')} texte={t('co.vide_texte')} />
            ) : (
              <View style={{ gap: 11, marginHorizontal: 18, marginTop: 11 }}>
                {donnees.derniers.map((x) => <CarteColis key={x.id} colis={x} />)}
              </View>
            )}

            {messages.length > 0 ? (
              <View style={[styles.messages, ombres.carte]} testID="accueil-messages">
                <Titre taille={15.5} style={{ marginBottom: 6 }}>{t('ac.messages')}</Titre>
                {messages.map((m, i) => (
                  <View key={i} style={[styles.message, i < messages.length - 1 && styles.messageBord]}>
                    <Feather name={m.canal === 'email' ? 'mail' : m.canal === 'whatsapp' ? 'message-circle' : 'bell'}
                      size={16} color={couleurs.texteDoux} />
                    <View style={{ flex: 1 }}>
                      <Texte gras taille={13.5}>
                        {STATUTS_CONNUS.indexOf(m.evenement) >= 0 ? libelleStatut(m.evenement, langue)
                          : m.evenement === 'bienvenue' ? t('msg.bienvenue') : t('msg.autre')}
                      </Texte>
                      <Texte doux taille={12}>
                        {[t('msg.' + m.canal), m.numero, dateRelative(m.envoye_le, langue)].filter(Boolean).join(' · ')}
                      </Texte>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </>
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

function Stat({ nombre, texte, icone, couleur, onPress, id }) {
  return (
    <Pressable onPress={onPress} style={[styles.stat, ombres.carte]} accessibilityRole="button"
      accessibilityLabel={`${nombre ?? 0} ${texte}`} testID={id}>
      <View style={[styles.statRond, { backgroundColor: couleur + '22' }]}>
        <Feather name={icone} size={18} color={couleur} />
      </View>
      <View>
        <Texte style={{ fontFamily: polices.titre, fontSize: 19 }} testID={id + '-nombre'}>{nombre ?? 0}</Texte>
        <Texte doux taille={12}>{texte}</Texte>
      </View>
    </Pressable>
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
  badge: { position: 'absolute', top: 4, right: 3, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, alignItems: 'center',
    justifyContent: 'center', backgroundColor: couleurs.accent, borderWidth: 2, borderColor: couleurs.nuit },
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
  alerte: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 18, marginTop: 11,
    padding: 13, borderRadius: 16, backgroundColor: 'rgba(220,38,38,0.08)', borderWidth: 1, borderColor: 'rgba(220,38,38,0.25)',
  },
  carteSolde: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 18, marginTop: 11, padding: 15,
    backgroundColor: couleurs.carte, borderRadius: 18, borderWidth: 1, borderColor: couleurs.bord,
  },
  suivre: {
    marginHorizontal: 18, marginTop: 11, padding: 15,
    backgroundColor: couleurs.carte, borderRadius: 18, borderWidth: 1, borderColor: couleurs.bord,
  },
  champSuivi: {
    flex: 1, minHeight: 48, paddingHorizontal: 14, borderRadius: rayons.champ, borderWidth: 1, borderColor: couleurs.bord,
    fontFamily: polices.mono, fontSize: 14, color: couleurs.texte,
  },
  boutonSuivi: { width: 48, height: 48, borderRadius: rayons.champ, backgroundColor: couleurs.nuit, alignItems: 'center', justifyContent: 'center' },
  ligneTitre: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginHorizontal: 18, marginTop: 20 },
  messages: {
    marginHorizontal: 18, marginTop: 16, padding: 15,
    backgroundColor: couleurs.carte, borderRadius: 18, borderWidth: 1, borderColor: couleurs.bord,
  },
  message: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 9 },
  messageBord: { borderBottomWidth: 1, borderBottomColor: '#f1f4fa' },
  bandePrealerte: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginHorizontal: 18,
    marginTop: 16,
    padding: 14,
    borderRadius: 20,
    backgroundColor: couleurs.nuit,
  },
  rondPrealerte: { width: 38, height: 38, borderRadius: 13, backgroundColor: 'rgba(244,96,13,0.20)', alignItems: 'center', justifyContent: 'center' },
});
