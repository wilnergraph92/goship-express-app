// Pré-alerte : le client annonce un achat avant son arrivée à Miami.
//
//   formulaire → vérification sur le téléphone (réponse immédiate)
//              → base (creer_prealerte : validation, doublon, clé d'envoi)
//              → « Pré-alerte enregistrée » seulement quand la base l'a confirmée
//
// Une seule pré-alerte par envoi : la clé d'envoi est tirée une fois et renvoyée à
// chaque nouvel essai (délai dépassé, réseau coupé…) ; la base reconnaît l'envoi et
// ne crée rien de plus. Un double appui ne part pas deux fois (verrou), et même s'il
// partait, la clé ferait le reste.
//
// (La photo de facture proposée par l'ancienne version n'était jamais envoyée : elle a
// été retirée plutôt que de laisser croire qu'elle l'était.)

import { useCallback, useEffect, useRef, useState } from 'react';
import { View, ScrollView, Pressable, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { couleurs, rayons, ombres } from '../../lib/theme';
import { Titre, Texte, Mono, Etiquette, Bouton, Champ, Bandeau } from '../../components/ui';
import { useLangue } from '../../lib/i18n';
import { useSession } from '../../lib/session';
import { useDonnees } from '../../lib/useDonnees';
import { creerPrealerte, mesPrealertes, supprimerPrealerte, nouvelleCle } from '../../lib/api';
import { classer, messageErreur } from '../../lib/erreurs';
import { verifierPrealerte } from '../../lib/validation';
import { dateCourte, montant } from '../../lib/format';

const MAGASINS = ['Amazon', 'SHEIN', 'Walmart', 'eBay', 'Temu', 'AliExpress'];
const VIDE = { magasin: '', description: '', suivi: '', valeur: '', service: 'aerien' };

export default function PreAlerte() {
  const { t, langue } = useLangue();
  const { verifierSession } = useSession();
  const marges = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const [champs, setChamps] = useState(VIDE);
  const [erreurs, setErreurs] = useState({});
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'ok' | 'erreur', texte }
  const [aSupprimer, setASupprimer] = useState(null);
  const [plus, setPlus] = useState({ lignes: [], page: 0, encore: false });
  const cleEnvoi = useRef(null);
  const envoiEnCours = useRef(false);
  const premier = useRef(true);

  // Code renvoyé par le scanner
  useEffect(() => {
    if (params.suivi) poser('suivi')(String(params.suivi));
  }, [params.suivi]); // eslint-disable-line react-hooks/exhaustive-deps

  const { donnees, erreur, recharger } = useDonnees(() => mesPrealertes(), []);
  useEffect(() => { if (donnees) setPlus({ lignes: [], page: 0, encore: donnees.suite }); }, [donnees]);
  useFocusEffect(useCallback(() => {
    if (premier.current) { premier.current = false; return; }
    recharger();
  }, [recharger]));

  // Un contenu différent est une autre pré-alerte : nouvelle clé au prochain envoi
  function poser(cle) {
    return (valeur) => {
      setChamps((c) => ({ ...c, [cle]: valeur }));
      setErreurs((e) => ({ ...e, [cle]: undefined }));
      cleEnvoi.current = null;
      setMessage(null);
    };
  }

  async function envoyer() {
    if (envoiEnCours.current) return;
    const v = verifierPrealerte(champs);
    if (!v.valide) {
      const traduits = {};
      Object.keys(v.erreurs).forEach((k) => { traduits[k] = t('err.' + v.erreurs[k]); });
      setErreurs(traduits);
      setMessage({ type: 'erreur', texte: t('pa.requis') });
      return;
    }
    envoiEnCours.current = true;
    setOccupe(true);
    setMessage(null);
    if (!cleEnvoi.current) cleEnvoi.current = nouvelleCle();
    try {
      await creerPrealerte(v.propre, cleEnvoi.current);
      // Confirmée par la base : maintenant seulement, on le dit
      cleEnvoi.current = null;
      setChamps(VIDE);
      setErreurs({});
      setMessage({ type: 'ok', texte: t('pa.envoyee') });
      recharger();
    } catch (e) {
      const c = classer(e);
      // Session refusée : on la renouvelle (sinon, retour à la connexion avec un message) ;
      // l'utilisateur renverra avec la même clé
      if (c.type === 'session') await verifierSession();
      if (c.code === 'PREALERT_STORE_REQUIRED') setErreurs({ magasin: messageErreur(e, t) });
      else if (c.code === 'PREALERT_DESCRIPTION_REQUIRED') setErreurs({ description: messageErreur(e, t) });
      else if (c.code === 'INVALID_TRACKING' || c.code === 'PREALERT_DUPLICATE' || c.code === 'PREALERT_ALREADY_RECEIVED') {
        setErreurs({ suivi: messageErreur(e, t) });
      } else if (c.code === 'INVALID_VALUE') setErreurs({ valeur: messageErreur(e, t) });
      // La clé reste : « Réessayer » renverra le MÊME envoi (si le premier est arrivé
      // malgré le délai dépassé, la base le rendra au lieu d'en créer un second)
      setMessage({ type: 'erreur', texte: messageErreur(e, t), reessai: ['reseau', 'delai', 'serveur'].indexOf(c.type) >= 0 });
    } finally {
      envoiEnCours.current = false;
      setOccupe(false);
    }
  }

  async function supprimer(id) {
    setASupprimer(null);
    try {
      await supprimerPrealerte(id);
      setMessage({ type: 'ok', texte: t('pa.supprimee') });
      recharger();
    } catch (e) {
      setMessage({ type: 'erreur', texte: messageErreur(e, t) });
    }
  }

  async function voirPlus() {
    const page = plus.page + 1;
    try {
      const r = await mesPrealertes({ page });
      setPlus((p) => ({ lignes: p.lignes.concat(r.lignes), page, encore: r.suite }));
    } catch (e) {
      setMessage({ type: 'erreur', texte: messageErreur(e, t) });
    }
  }

  const liste = donnees ? donnees.lignes.concat(plus.lignes) : [];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <View style={[styles.entete, { paddingTop: marges.top + 16 }]}>
        <View style={styles.halo} pointerEvents="none" />
        <Titre taille={21} couleur="#ffffff">{t('pa.titre')}</Titre>
        <Texte taille={12.5} style={{ marginTop: 12, color: couleurs.surNuit, lineHeight: 19 }}>{t('pa.intro')}</Texte>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 36, gap: 13 }} keyboardShouldPersistTaps="handled">
        <Champ etiquette={t('pa.magasin')} value={champs.magasin} onChangeText={poser('magasin')} placeholder="Amazon"
          erreur={erreurs.magasin} maxLength={80} testID="pa-magasin" />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -4 }}>
          {MAGASINS.map((m) => (
            <Pressable key={m} onPress={() => poser('magasin')(m)} accessibilityRole="button" style={styles.suggestion}>
              <Texte gras taille={12.5} doux>{m}</Texte>
            </Pressable>
          ))}
        </View>

        <Champ etiquette={t('pa.contenu')} value={champs.description} onChangeText={poser('description')} placeholder="…"
          erreur={erreurs.description} maxLength={300} testID="pa-contenu" />

        <View style={{ gap: 7 }}>
          <View style={{ flexDirection: 'row', gap: 9, alignItems: 'flex-start' }}>
            <Champ
              etiquette={t('pa.suivi')}
              value={champs.suivi}
              onChangeText={poser('suivi')}
              placeholder="TBA123456789000"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={60}
              erreur={erreurs.suivi}
              style={{ flex: 1 }}
              testID="pa-suivi"
            />
            <Pressable
              onPress={() => router.push({ pathname: '/scanner', params: { mode: 'prealerte' } })}
              style={[styles.scan, ombres.bouton]}
              accessibilityRole="button"
              accessibilityLabel={t('pa.scanner')}
              testID="pa-scanner"
            >
              <Feather name="maximize" size={22} color="#ffffff" />
            </Pressable>
          </View>
          <Texte doux taille={12}>{t('pa.suivi_aide')}</Texte>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Champ etiquette={t('pa.valeur')} value={champs.valeur} onChangeText={poser('valeur')} keyboardType="decimal-pad"
            erreur={erreurs.valeur} style={{ flex: 1 }} maxLength={10} testID="pa-valeur" />
          <View style={{ flex: 1, gap: 7 }}>
            <Etiquette>{t('de.service')}</Etiquette>
            <View style={styles.segments} accessibilityRole="radiogroup">
              {['aerien', 'maritime'].map((s) => (
                <Pressable
                  key={s}
                  onPress={() => poser('service')(s)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: champs.service === s }}
                  style={[styles.segment, champs.service === s && styles.segmentActif]}
                  testID={'pa-service-' + s}
                >
                  <Texte gras taille={13} style={{ color: champs.service === s ? couleurs.texte : couleurs.texteDoux }}>
                    {t('service.' + s)}
                  </Texte>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {message ? (
          <View style={[styles.message, message.type === 'ok' ? styles.messageOk : styles.messageErreur]}
            accessibilityLiveRegion="polite" testID={'pa-message-' + message.type}>
            <Feather name={message.type === 'ok' ? 'check-circle' : 'alert-circle'} size={18}
              color={message.type === 'ok' ? couleurs.vert : couleurs.rouge} />
            <Texte taille={13.5} style={{ flex: 1, lineHeight: 19 }}>{message.texte}</Texte>
          </View>
        ) : null}

        <Bouton titre={message && message.reessai ? t('gen.reessayer') : t('pa.envoyer')}
          icone={message && message.reessai ? 'refresh-cw' : 'check'} onPress={envoyer} occupe={occupe}
          accessibilityLabel={occupe ? t('pa.envoi') : undefined} style={{ marginTop: 4 }} testID="pa-envoyer" />

        {donnees ? <Bandeau erreur={erreur} onReessayer={recharger} /> : null}

        {liste.length > 0 ? (
          <View style={{ marginTop: 14, gap: 11 }} testID="pa-liste">
            <Titre taille={16}>{t('pa.mes_prealertes')}</Titre>
            {liste.map((p) => (
              <View key={p.id} style={[styles.carte, ombres.carte]} testID="pa-ligne">
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <Texte gras taille={14} style={{ flex: 1 }} numberOfLines={1}>{p.magasin}</Texte>
                  {p.statut === 'attente' ? (
                    <Pressable
                      onPress={() => setASupprimer(aSupprimer === p.id ? null : p.id)}
                      accessibilityRole="button"
                      accessibilityLabel={t('gen.supprimer') + ' ' + p.magasin}
                      hitSlop={12}
                      testID="pa-supprimer"
                    >
                      <Feather name="trash-2" size={17} color={couleurs.texteFaible} />
                    </Pressable>
                  ) : null}
                </View>
                <Texte doux taille={12.5} style={{ marginTop: 3 }}>{p.description}</Texte>
                {p.suivi_transporteur ? <Mono taille={11.5} couleur={couleurs.texteFaible} style={{ marginTop: 5 }}>{p.suivi_transporteur}</Mono> : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 9 }}>
                  <Texte taille={11.5} doux>{dateCourte(p.cree_le, langue)}</Texte>
                  <Texte gras taille={11.5} style={{ color: p.statut === 'recu' ? couleurs.vert : couleurs.accent }}>
                    {p.statut === 'recu' ? t('pa.associee') : t('pa.attente')}
                    {p.valeur_usd != null ? ` · ${montant(p.valeur_usd, langue)}` : ''}
                  </Texte>
                </View>
                {aSupprimer === p.id ? (
                  <View style={styles.confirmer}>
                    <Texte gras taille={13} style={{ flex: 1 }}>{t('pa.supprimer_question')}</Texte>
                    <Pressable onPress={() => setASupprimer(null)} accessibilityRole="button" style={styles.petitBouton}>
                      <Texte gras taille={13} doux>{t('gen.annuler')}</Texte>
                    </Pressable>
                    <Pressable onPress={() => supprimer(p.id)} accessibilityRole="button" testID="pa-supprimer-oui"
                      style={[styles.petitBouton, { backgroundColor: 'rgba(192,57,43,0.1)' }]}>
                      <Texte gras taille={13} style={{ color: couleurs.rouge }}>{t('gen.supprimer')}</Texte>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))}
            {(plus.page === 0 ? donnees?.suite : plus.encore) ? (
              <Bouton titre={t('pa.plus')} variante="secondaire" onPress={voirPlus} />
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  entete: {
    backgroundColor: couleurs.nuit,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  halo: { position: 'absolute', top: -80, right: -50, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(244,96,13,0.18)' },
  suggestion: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: rayons.pastille, backgroundColor: '#eaeff8', minHeight: 36, justifyContent: 'center' },
  scan: { width: 54, height: 54, marginTop: 17, borderRadius: rayons.champ, backgroundColor: couleurs.accent, alignItems: 'center', justifyContent: 'center' },
  segments: { flexDirection: 'row', height: 54, padding: 5, borderRadius: rayons.champ, backgroundColor: '#e9eef7' },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
  segmentActif: { backgroundColor: couleurs.carte },
  message: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderRadius: 14, borderWidth: 1 },
  messageOk: { backgroundColor: 'rgba(14,159,110,0.08)', borderColor: 'rgba(14,159,110,0.3)' },
  messageErreur: { backgroundColor: 'rgba(192,57,43,0.07)', borderColor: 'rgba(192,57,43,0.3)' },
  carte: { backgroundColor: couleurs.carte, borderRadius: 18, borderWidth: 1, borderColor: couleurs.bord, padding: 14 },
  confirmer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 11, paddingTop: 11, borderTopWidth: 1, borderTopColor: '#f1f4fa' },
  petitBouton: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 11, minHeight: 40, justifyContent: 'center' },
});
