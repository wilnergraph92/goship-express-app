// Accueil : adresse de Miami, colis en cours, action requise, derniers colis. La
// pré-alerte s'ouvre par le bouton orange de la barre du bas. La disposition est celle des téléphones du site (section
// « Vos colis dans votre poche », outils/ecrans-app/ecrans.py) : rien de plus. Le solde
// est dans Factures, les messages derrière la cloche (messages.jsx), le suivi d'un
// numéro par le scanner ou un lien.
//
// Tous les chiffres viennent de la base (mon_resume, la même fonction que l'espace
// client du site) : l'application ne compte ni n'additionne rien elle-même. Tirer
// l'écran vers le bas recharge tout.
//
// L'accueil ne montre jamais un colis livré : ses derniers mouvements sont ceux des colis
// qui ne sont pas encore arrivés au client. Les colis livrés sont dans Compte >
// Historicité (app/historicite.jsx) et sous « Livrés » dans Mes colis.

import { useCallback, useEffect, useRef, useState } from 'react';
import { View, ScrollView, Image, Pressable, RefreshControl, Share, StyleSheet } from 'react-native';
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
import { mesColis, monResume, surveiller } from '../../lib/api';
import { profilIncomplet } from '../../lib/connexion-sociale';

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

// À l'écran, trois lignes comme le téléphone du site : « nom · code », la rue et
// l'appartement, la ville et le pays. Copier et Partager donnent l'adresse ligne par
// ligne (adresseComplete), telle qu'un formulaire de livraison la demande.
function adresseAffichee(profil) {
  const a = config.adresseMiami;
  return [
    [profil?.nom_complet || '', profil?.code || ''].filter(Boolean).join(' · '),
    [a.ligne1, a.ligne2].filter(Boolean).join(' — '),
    [a.ligne3, a.pays].filter(Boolean).join(', '),
  ].filter(Boolean).join('\n');
}

// Profil incomplet (compte ouvert avec Google, le plus souvent) : « Mes informations »
// s'ouvre de lui-même, une fois par compte et par lancement de l'application. Refermé,
// il reste la carte de l'accueil ; et la base refuse les pré-alertes tant qu'il manque
// quelque chose.
const profilsProposes = new Set();

export default function Accueil() {
  const { t } = useLangue();
  const { profil, equipe } = useSession();
  const marges = useSafeAreaInsets();
  const [copie, setCopie] = useState(false);
  const premier = useRef(true);

  // Deux derniers colis, comme le téléphone du site ; « Tout voir » mène aux autres.
  // Pas un colis livré : le filtre est celui de la base (voir FILTRES.actifs).
  const { donnees, erreur, recharger, rafraichit, tirer, chargement } = useDonnees(async () => {
    const [resume, derniers] = await Promise.all([monResume(), mesColis({ parPage: 2, filtre: 'actifs' })]);
    return { resume, derniers: derniers.lignes };
  }, []);

  // À chaque retour sur l'accueil, et à chaque changement fait par l'équipe
  useFocusEffect(useCallback(() => {
    if (premier.current) { premier.current = false; return; }
    recharger();
  }, [recharger]));
  useEffect(() => surveiller(profil?.id, recharger), [profil?.id, recharger]);
  useEffect(() => {
    if (!profil?.id || profilsProposes.has(profil.id) || equipe || !profilIncomplet(profil)) return;
    profilsProposes.add(profil.id);
    router.push('/profil');
  }, [profil, equipe]);

  const resume = donnees?.resume;
  const c = resume?.colis || {};

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
            onPress={() => router.push('/messages')}
            style={styles.rond}
            accessibilityRole="button"
            accessibilityLabel={t('ac.messages')}
            testID="accueil-messages"
          >
            <Feather name="bell" size={19} color="#ffffff" />
            {c.disponibles > 0 || c.action_requise > 0 ? <View style={styles.pastille} /> : null}
          </Pressable>
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
        {/* Le bas de l'en-tête, dans la zone qui défile : la carte le chevauche sans être
            rognée (Android coupe tout ce qui dépasse d'un ScrollView) */}
        <View style={styles.rallonge} />
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
            <Texte gras taille={14} style={{ marginTop: 9, lineHeight: 21 }} testID="accueil-adresse">{adresseAffichee(profil)}</Texte>
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

        {/* Compte ouvert avec Google : pays, ville ou téléphone manquent encore */}
        {!equipe && profilIncomplet(profil) ? (
          <Pressable onPress={() => router.push('/profil')} style={[styles.carteCompleter, ombres.carte]}
            accessibilityRole="button" testID="accueil-completer">
            <Feather name="user-check" size={20} color={couleurs.accent} />
            <View style={{ flex: 1 }}>
              <Texte gras taille={14}>{t('pf.completer_titre')}</Texte>
              <Texte doux taille={12.5} style={{ marginTop: 3, lineHeight: 18 }}>{t('pf.completer_texte')}</Texte>
            </View>
            <Feather name="chevron-right" size={18} color={couleurs.texteDoux} />
          </Pressable>
        ) : null}

        {donnees ? <Bandeau erreur={erreur} onReessayer={recharger} /> : null}

        {chargement ? (
          <Chargement />
        ) : !donnees ? (
          <EtatErreur erreur={erreur} onReessayer={recharger} />
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 11, marginHorizontal: 18, marginTop: 14 }}>
              <Stat nombre={c.en_cours} texte={t('ac.en_cours')} icone="navigation" couleur={couleurs.bleu} id="stat-en-cours"
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

            <View style={styles.ligneTitre}>
              <Titre taille={17}>{t('ac.derniers')}</Titre>
              <Pressable onPress={() => router.push('/(onglets)/colis')} accessibilityRole="button" hitSlop={10}>
                <Texte gras taille={13} style={{ color: couleurs.accent }}>{t('ac.tout_voir')}</Texte>
              </Pressable>
            </View>
            {donnees.derniers.length === 0 ? (
              // Que des colis livrés : ce n'est pas « aucun colis », ils sont dans l'historique
              c.livres > 0 ? (
                <Vide titre={t('ac.rien_en_cours')} texte={t('ac.rien_en_cours_texte')} testID="accueil-rien-en-cours">
                  <Bouton titre={t('hi.titre')} icone="clock" variante="secondaire" onPress={() => router.push('/historicite')}
                    style={{ minHeight: 46 }} testID="accueil-historicite" />
                </Vide>
              ) : (
                <Vide titre={t('co.vide')} texte={t('co.vide_texte')} />
              )
            ) : (
              <View style={{ gap: 11, marginHorizontal: 18, marginTop: 11 }}>
                {donnees.derniers.map((x) => <CarteColis key={x.id} colis={x} sansDate />)}
              </View>
            )}
          </>
        )}
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
    paddingBottom: 4,
    overflow: 'hidden',
  },
  rallonge: { height: 26, backgroundColor: couleurs.nuit, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
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
  carteCompleter: {
    marginHorizontal: 18,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: couleurs.carte,
    borderRadius: rayons.carte,
    borderWidth: 1,
    borderColor: couleurs.accent,
    padding: 16,
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
  ligneTitre: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginHorizontal: 18, marginTop: 20 },
});
