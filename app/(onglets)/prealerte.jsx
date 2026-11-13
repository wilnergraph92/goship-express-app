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
//
// Mes colis en route (suivi universel, Phase 5) : l'écran a deux vues. « Annoncer un achat »
// (le formulaire ci-dessus, inchangé, et la vue par défaut : le « + » central et le lien
// goshipexpress://prealerte y mènent) et « Mes achats » (?vue=liste, ouverte aussi par une
// notification d'un transporteur) : les achats annoncés et ce qu'en dit leur transporteur,
// lus par la même fonction que le site (mesSuivis), avec une recherche et des filtres. Le
// détail et la suppression d'un achat sont sur son écran (app/achat/[id].jsx).

import { useCallback, useEffect, useRef, useState } from 'react';
import { View, ScrollView, Pressable, KeyboardAvoidingView, Platform, StyleSheet, RefreshControl } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { couleurs, rayons, ombres } from '../../lib/theme';
import { Titre, Texte, Etiquette, Bouton, Champ, Bandeau, Chargement, EtatErreur, Vide } from '../../components/ui';
import { useLangue } from '../../lib/i18n';
import { useSession } from '../../lib/session';
import { useDonnees } from '../../lib/useDonnees';
import { creerPrealerte, mesSuivis, nouvelleCle } from '../../lib/api';
import { classer, messageErreur } from '../../lib/erreurs';
import { verifierPrealerte } from '../../lib/validation';
import { profilIncomplet } from '../../lib/connexion-sociale';
import { CarteAchat } from '../../components/achat';
import { filtrerAchats, compterAchats, natureNumero } from '../../lib/suivi-externe';

const FILTRES = ['tous', 'attente', 'livre', 'recu', 'info'];

const MAGASINS = ['Amazon', 'SHEIN', 'Walmart', 'eBay', 'Temu', 'AliExpress'];
const VIDE = { magasin: '', description: '', suivi: '', valeur: '', service: 'aerien' };

export default function PreAlerte() {
  const { t } = useLangue();
  const { verifierSession, profil, equipe } = useSession();
  const aCompleter = !equipe && profilIncomplet(profil);
  const marges = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const [champs, setChamps] = useState(VIDE);
  const [erreurs, setErreurs] = useState({});
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'ok' | 'erreur', texte }
  const [vue, setVue] = useState(params.vue === 'liste' ? 'liste' : 'annoncer');
  const [filtre, setFiltre] = useState('tous');
  const [recherche, setRecherche] = useState('');
  const [luLe, setLuLe] = useState(null);
  const cleEnvoi = useRef(null);
  const envoiEnCours = useRef(false);
  const premier = useRef(true);

  // Code renvoyé par le scanner (ou numéro de transporteur venu de l'écran Suivi) : le formulaire
  useEffect(() => {
    if (params.suivi) { poser('suivi')(String(params.suivi)); setVue('annoncer'); }
  }, [params.suivi]); // eslint-disable-line react-hooks/exhaustive-deps
  // Une notification d'un transporteur ouvre la liste
  useEffect(() => { if (params.vue === 'liste') setVue('liste'); }, [params.vue]);

  const { donnees, erreur, recharger, rafraichit, tirer } = useDonnees(() => mesSuivis(), []);
  // L'heure de la dernière lecture réussie : hors ligne, l'écran dit de quand datent les informations
  useEffect(() => { if (donnees) setLuLe(new Date().toISOString()); }, [donnees]);
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
    // Un numéro de commande ou de colis GoShip ne se suit pas chez un transporteur : on le dit avant l'envoi
    const nature = natureNumero(champs.suivi);
    if (nature) {
      setErreurs({ suivi: nature === 'commande' ? t('er.message.ORDER_NUMBER_DETECTED') : t('er.numero_goship') });
      setMessage({ type: 'erreur', texte: t('pa.requis') });
      return;
    }
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
      setMessage({ type: 'erreur', texte: messageErreur(e, t), reessai: ['reseau', 'delai', 'serveur'].indexOf(c.type) >= 0,
                   profil: c.code === 'PROFILE_INCOMPLETE' });
    } finally {
      envoiEnCours.current = false;
      setOccupe(false);
    }
  }

  const achats = donnees || [];
  const nombres = compterAchats(achats);
  const visibles = filtrerAchats(achats, filtre, recherche);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <View style={[styles.entete, { paddingTop: marges.top + 16 }]}>
        <View style={styles.halo} pointerEvents="none" />
        <Titre taille={21} couleur="#ffffff">{t('er.titre')}</Titre>
        <Texte taille={12.5} style={{ marginTop: 12, color: couleurs.surNuit, lineHeight: 19 }}>{t('er.intro')}</Texte>
        <View style={[styles.vues, { marginTop: 16 }]} accessibilityRole="tablist">
          {['annoncer', 'liste'].map((v) => (
            <Pressable key={v} onPress={() => setVue(v)} accessibilityRole="tab" accessibilityState={{ selected: vue === v }}
              style={[styles.vue, vue === v && styles.vueActive]} testID={'pa-vue-' + v}>
              <Texte gras taille={13} style={{ color: vue === v ? couleurs.texte : '#ffffff' }} numberOfLines={1}>
                {v === 'annoncer' ? t('er.vue_annoncer') : t('er.vue_liste', { n: nombres.tous })}
              </Texte>
            </Pressable>
          ))}
        </View>
      </View>

      {vue === 'liste' ? (
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 36, gap: 12 }} keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={rafraichit} onRefresh={tirer} tintColor={couleurs.accent} />}
          testID="pa-liste">
          {donnees ? <Bandeau erreur={erreur} onReessayer={recharger} depuis={luLe} /> : null}
          {!donnees && !erreur ? <Chargement /> : null}
          {!donnees && erreur ? <EtatErreur erreur={erreur} onReessayer={recharger} /> : null}
          {donnees && achats.length === 0 ? (
            <Vide icone="truck" titre={t('er.vide_titre')} texte={t('er.vide_texte')} testID="pa-liste-vide">
              <Bouton titre={t('er.vue_annoncer')} icone="plus" onPress={() => setVue('annoncer')} />
            </Vide>
          ) : null}
          {achats.length > 0 ? (
            <>
              <Champ value={recherche} onChangeText={setRecherche} placeholder={t('er.chercher')} autoCorrect={false}
                accessibilityLabel={t('er.chercher')} testID="pa-chercher" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {FILTRES.filter((f) => f === 'tous' || nombres[f] > 0).map((f) => (
                  <Pressable key={f} onPress={() => setFiltre(f)} accessibilityRole="button"
                    accessibilityState={{ selected: filtre === f }}
                    style={[styles.filtre, filtre === f && styles.filtreActif]} testID={'pa-filtre-' + f}>
                    <Texte gras taille={12.5} style={{ color: filtre === f ? '#ffffff' : couleurs.texteDoux }}>
                      {t('er.filtre.' + f)} · {nombres[f]}
                    </Texte>
                  </Pressable>
                ))}
              </ScrollView>
              {visibles.length === 0 ? (
                <Texte doux taille={13.5} style={{ textAlign: 'center', paddingVertical: 24 }} testID="pa-aucun-resultat">
                  {t('er.aucun_resultat')}
                </Texte>
              ) : visibles.map((a) => <CarteAchat key={a.id} achat={a} />)}
            </>
          ) : null}
        </ScrollView>
      ) : (
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 36, gap: 13 }} keyboardShouldPersistTaps="handled">
        {aCompleter ? (
          <Pressable onPress={() => router.push('/profil')} style={[styles.carte, styles.completer]}
            accessibilityRole="button" testID="pa-completer">
            <Feather name="user-check" size={20} color={couleurs.accent} />
            <View style={{ flex: 1 }}>
              <Texte gras taille={14}>{t('pf.completer_titre')}</Texte>
              <Texte doux taille={12.5} style={{ marginTop: 3, lineHeight: 18 }}>{t('err.PROFILE_INCOMPLETE')}</Texte>
            </View>
            <Feather name="chevron-right" size={18} color={couleurs.texteDoux} />
          </Pressable>
        ) : null}
        <Champ etiquette={t('pa.magasin')} value={champs.magasin} onChangeText={poser('magasin')} placeholder="Amazon"
          erreur={erreurs.magasin} maxLength={80} testID="pa-magasin" />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -4 }}>
          {MAGASINS.map((m) => (
            <Pressable key={m} onPress={() => poser('magasin')(m)} accessibilityRole="button" style={styles.suggestion}
              testID={'pa-suggestion-' + m}>
              <Texte gras taille={12.5} doux>{m}</Texte>
            </Pressable>
          ))}
        </View>

        <Champ etiquette={t('pa.contenu')} value={champs.description} onChangeText={poser('description')} placeholder={t('pa.contenu_ph')}
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
        {message && message.type === 'ok' ? (
          <Bouton titre={t('er.voir_liste')} icone="truck" variante="secondaire" onPress={() => setVue('liste')}
            testID="pa-voir-liste" />
        ) : null}
        {message && message.profil ? (
          <Bouton titre={t('pf.completer_bouton')} icone="user-check" variante="secondaire"
            onPress={() => router.push('/profil')} testID="pa-completer-profil" />
        ) : null}

        <Bouton titre={message && message.reessai ? t('gen.reessayer') : t('pa.envoyer')}
          icone={message && message.reessai ? 'refresh-cw' : 'check'} onPress={envoyer} occupe={occupe}
          accessibilityLabel={occupe ? t('pa.envoi') : undefined} style={{ marginTop: 4 }} testID="pa-envoyer" />

      </ScrollView>
      )}
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
  vues: { flexDirection: 'row', padding: 4, borderRadius: rayons.champ, backgroundColor: 'rgba(255,255,255,0.12)' },
  vue: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 11, paddingHorizontal: 8 },
  vueActive: { backgroundColor: couleurs.carte },
  filtre: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: rayons.pastille, backgroundColor: '#eaeff8', minHeight: 38, justifyContent: 'center' },
  filtreActif: { backgroundColor: couleurs.nuit },
  completer: { flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: couleurs.accent },
});
