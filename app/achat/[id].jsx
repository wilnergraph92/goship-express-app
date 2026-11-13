// Détail d'un achat annoncé (pré-alerte) et ce qu'en dit son transporteur (suivi universel,
// Phase 5) : le statut en clair, le transporteur, le dernier lieu, la date prévue s'il la
// donne, la fraîcheur de la lecture et la chronologie complète, avec sa source.
//
// Tout vient de la même lecture que la liste (mesSuivis, mes_suivis_externes) : la base ne
// rend que les achats du compte, et rien d'un fournisseur pas encore vérifié. L'application
// ne décide rien : elle traduit les codes en phrases (lib/suivi-externe.js). « Livré » par le
// transporteur n'est jamais « reçu » : seul le scan de l'entrepôt GoShip le dit.
//
// « Supprimer cet achat » efface l'annonce (comme l'ancienne liste des pré-alertes), jamais
// le suivi chez le transporteur : le moteur l'arrête de lui-même, à sa fin naturelle.

import { useState } from 'react';
import { View, ScrollView, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { couleurs, rayons, ombres } from '../../lib/theme';
import { Titre, Texte, Mono, Etiquette, Bouton, Chargement, EtatErreur, Bandeau } from '../../components/ui';
import { PuceAchat, phraseAchat } from '../../components/achat';
import { useLangue } from '../../lib/i18n';
import { useDonnees } from '../../lib/useDonnees';
import { mesSuivis, supprimerPrealerte } from '../../lib/api';
import { messageErreur } from '../../lib/erreurs';
import { dateCourte, dateRelative, libelleService, montant } from '../../lib/format';
import { etatAchat, phraseStatut, titreAchat, depuis, dateSeule } from '../../lib/suivi-externe';

export default function DetailAchat() {
  const { id } = useLocalSearchParams();
  const { t, langue } = useLangue();
  const marges = useSafeAreaInsets();
  const [confirmer, setConfirmer] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState(null);

  const { donnees: achat, erreur, recharger, rafraichit, tirer, chargement } = useDonnees(async () => {
    const achats = await mesSuivis();
    const a = achats.find((x) => x.id === String(id || ''));
    // Plus dans la liste (supprimé, arrivé depuis longtemps) ou pas à ce compte : la même phrase
    if (!a) {
      const e = new Error('introuvable');
      e.goship = { type: 'introuvable', code: 'INTROUVABLE', detail: t('er.introuvable') };
      throw e;
    }
    return a;
  }, [id]);

  async function supprimer() {
    setOccupe(true);
    setMessage(null);
    try {
      await supprimerPrealerte(achat.id);
      router.replace({ pathname: '/(onglets)/prealerte', params: { vue: 'liste' } });
    } catch (e) {
      setMessage(messageErreur(e, t));
      setOccupe(false);
    }
  }

  const s = achat && achat.statut !== 'recu' ? achat.suivi : null;
  const etat = achat ? etatAchat(achat) : 'attente';
  const evenements = (s && s.evenements) || [];
  const maj = s && s.mis_a_jour_le
    ? (depuis(s.mis_a_jour_le, t) || t('er.maj_le', { date: dateRelative(s.mis_a_jour_le, langue, true) }))
    : '';

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <View style={[styles.entete, { paddingTop: marges.top + 14 }]}>
        <View style={styles.halo} pointerEvents="none" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back()
              : router.replace({ pathname: '/(onglets)/prealerte', params: { vue: 'liste' } }))}
            style={styles.rond}
            accessibilityRole="button"
            accessibilityLabel={t('gen.retour')}
            testID="retour"
          >
            <Feather name="arrow-left" size={20} color="#ffffff" />
          </Pressable>
          <Titre taille={16} couleur="#ffffff" style={{ flex: 1 }} numberOfLines={1} testID="achat-titre">
            {achat ? titreAchat(achat) : t('er.titre')}
          </Titre>
        </View>
      </View>

      {achat ? <Bandeau erreur={erreur} onReessayer={recharger} /> : null}

      {chargement ? (
        <Chargement />
      ) : !achat ? (
        <View style={{ paddingTop: 20 }}><EtatErreur erreur={erreur} onReessayer={recharger} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={rafraichit} onRefresh={tirer} tintColor={couleurs.accent} />}
        >
          <View style={styles.rallonge} />
          <View style={[styles.carteStatut, ombres.carte]}>
            <PuceAchat etat={etat} style={{ alignSelf: 'flex-start' }} />
            <Titre taille={17} style={{ marginTop: 11, lineHeight: 23 }} testID="achat-statut">
              {phraseAchat(achat, t)}
            </Titre>
            {s ? (
              <View style={{ marginTop: 9, gap: 4 }}>
                <Texte doux taille={13} testID="achat-transporteur">
                  {s.transporteur_nom ? t('er.transporteur', { nom: s.transporteur_nom }) : t('er.transporteur_inconnu')}
                </Texte>
                {s.dernier_lieu ? <Texte doux taille={13}>{t('er.dernier_lieu', { lieu: s.dernier_lieu })}</Texte> : null}
                {/* La date donnée par le transporteur, et seulement elle : jamais une estimation de GoShip */}
                {s.livraison_estimee_le && s.statut !== 'DELIVERED' ? (
                  <Texte doux taille={13} testID="achat-livraison">
                    {t('er.livraison_prevue', { date: dateCourte(dateSeule(s.livraison_estimee_le), langue) })}
                  </Texte>
                ) : null}
                {maj ? <Texte doux taille={12} style={{ marginTop: 2 }} testID="achat-maj">{maj}</Texte> : null}
              </View>
            ) : null}
            {achat.statut !== 'recu' && achat.suivi && achat.message ? (
              <View style={styles.note}><Texte taille={12.5} doux style={{ lineHeight: 19 }}>{t('er.message.' + achat.message)}</Texte></View>
            ) : null}
            {achat.colis ? (
              <Bouton titre={t('er.voir_colis', { numero: achat.colis.numero })} icone="package" variante="secondaire"
                onPress={() => router.push({ pathname: '/suivi', params: { numero: achat.colis.numero } })}
                style={{ marginTop: 14 }} testID="achat-voir-colis" />
            ) : null}
          </View>

          <View style={styles.grille}>
            {achat.numero_suivi ? <Info etiquette={t('pa.suivi')} valeur={achat.numero_suivi} large mono /> : null}
            <Info etiquette={t('de.service')} valeur={libelleService(achat.service, langue)} />
            <Info etiquette={t('pa.valeur')} valeur={achat.valeur_usd != null ? montant(achat.valeur_usd, langue) : '—'} />
            <Info etiquette={t('er.annonce')} valeur={dateCourte(achat.cree_le, langue)} large />
          </View>

          {s ? (
            <View style={[styles.carteEtapes, ombres.carte]} testID="achat-parcours">
              <Titre taille={15.5} style={{ marginBottom: 14 }}>{t('er.parcours')}</Titre>
              {evenements.length === 0 ? (
                <Texte doux taille={13}>{t('er.aucun_evenement')}</Texte>
              ) : evenements.map((e, index) => {
                const dernier = index === evenements.length - 1;
                // Le texte d'origine du transporteur, tel quel ; à défaut, la phrase de son statut
                const titre = e.description || (e.statut ? phraseStatut({ statut: e.statut }, t) : '');
                return (
                  <View key={index} style={{ flexDirection: 'row', gap: 14 }} accessible
                    accessibilityLabel={[titre, dateRelative(e.survenu_le, langue), e.lieu].filter(Boolean).join(', ')}>
                    <View style={{ alignItems: 'center' }}>
                      <View style={[styles.point, index === 0 && { backgroundColor: couleurs.accent }]} />
                      {!dernier ? <View style={styles.fil} /> : null}
                    </View>
                    <View style={{ flex: 1, paddingBottom: dernier ? 4 : 12 }}>
                      <Texte gras taille={13.5} testID="achat-evenement">{titre}</Texte>
                      <Texte doux taille={12} style={{ marginTop: 2 }}>
                        {dateRelative(e.survenu_le, langue)}{e.lieu ? ` · ${e.lieu}` : ''}
                      </Texte>
                    </View>
                  </View>
                );
              })}
              <Texte doux taille={11.5} style={{ marginTop: 12 }} testID="achat-source">{t('er.source')}</Texte>
            </View>
          ) : null}

          {achat.statut === 'attente' ? (
            <View style={{ marginHorizontal: 18, marginTop: 18, gap: 10 }}>
              {confirmer ? (
                <View style={[styles.confirmer, ombres.carte]}>
                  <Texte gras taille={13.5} style={{ lineHeight: 19 }}>{t('er.supprimer_question')}</Texte>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Bouton titre={t('gen.annuler')} variante="secondaire" onPress={() => setConfirmer(false)} style={{ flex: 1 }} />
                    <Bouton titre={t('gen.supprimer')} variante="sombre" icone="trash-2" onPress={supprimer} occupe={occupe}
                      style={{ flex: 1 }} testID="achat-supprimer-oui" />
                  </View>
                </View>
              ) : (
                <Bouton titre={t('er.supprimer')} icone="trash-2" variante="secondaire" onPress={() => setConfirmer(true)}
                  testID="achat-supprimer" />
              )}
              {message ? <Texte taille={13} style={{ color: couleurs.rouge }} testID="achat-erreur">{message}</Texte> : null}
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function Info({ etiquette, valeur, large, mono }) {
  return (
    <View style={[styles.info, large && { width: '100%' }]}>
      <Etiquette>{etiquette}</Etiquette>
      {mono
        ? <Mono taille={13.5} style={{ marginTop: 5 }} selectable>{valeur}</Mono>
        : <Texte gras taille={14.5} style={{ marginTop: 5 }} numberOfLines={3}>{valeur}</Texte>}
    </View>
  );
}

const styles = StyleSheet.create({
  entete: { backgroundColor: couleurs.nuit, paddingHorizontal: 18, paddingBottom: 12, overflow: 'hidden' },
  rallonge: { height: 34, backgroundColor: couleurs.nuit },
  halo: { position: 'absolute', top: -90, right: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(244,96,13,0.18)' },
  rond: { width: 44, height: 44, borderRadius: 14, backgroundColor: couleurs.voileClair, alignItems: 'center', justifyContent: 'center' },
  carteStatut: {
    marginHorizontal: 18, marginTop: -34, backgroundColor: couleurs.carte, borderRadius: 24,
    borderWidth: 1, borderColor: couleurs.bord, padding: 18,
  },
  grille: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginHorizontal: 18, marginTop: 14 },
  info: {
    width: '47.8%', flexGrow: 1, backgroundColor: couleurs.carte, borderRadius: 16,
    borderWidth: 1, borderColor: couleurs.bord, padding: 12,
  },
  carteEtapes: {
    marginHorizontal: 18, marginTop: 16, backgroundColor: couleurs.carte, borderRadius: rayons.carte,
    borderWidth: 1, borderColor: couleurs.bord, padding: 18,
  },
  point: { width: 13, height: 13, borderRadius: 7, marginTop: 2, backgroundColor: '#cfd7e6' },
  fil: { flex: 1, width: 2, backgroundColor: '#edf1f8', marginVertical: 2 },
  note: { marginTop: 12, backgroundColor: '#f7f9fd', borderRadius: 12, padding: 10 },
  confirmer: { backgroundColor: couleurs.carte, borderRadius: 18, borderWidth: 1, borderColor: couleurs.bord, padding: 14, gap: 12 },
});
