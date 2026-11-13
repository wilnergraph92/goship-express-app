// Un achat annoncé (pré-alerte) et ce qu'en dit son transporteur : la puce d'état et la carte
// de la liste « Mes achats ». Mêmes informations et mêmes phrases que l'espace client du
// site ; rien n'est calculé ici (lib/suivi-externe.js ne fait que traduire).

import { memo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { couleurs, rayons, ombres, STATUTS } from '../lib/theme';
import { Texte, Mono } from './ui';
import { useLangue } from '../lib/i18n';
import { etatAchat, phraseStatut, titreAchat } from '../lib/suivi-externe';

// Les couleurs des statuts GoShip, reprises pour les quatre états d'un achat
const COULEURS_ETAT = {
  attente: STATUTS.embarque,
  livre: STATUTS.disponible,
  recu: STATUTS.livre,
  info: STATUTS.incident,
};

export function PuceAchat({ etat, style }) {
  const { t } = useLangue();
  const c = COULEURS_ETAT[etat] || COULEURS_ETAT.attente;
  return (
    <View style={[{ backgroundColor: c.fond, borderRadius: rayons.pastille, paddingHorizontal: 11, paddingVertical: 5 }, style]}>
      <Texte gras taille={11.5} style={{ color: c.couleur }}>{t('er.badge.' + etat)}</Texte>
    </View>
  );
}

// La phrase principale d'une carte : arrivé, le statut du transporteur, sinon le message de la base
export function phraseAchat(achat, t) {
  if (achat.statut === 'recu') {
    return achat.colis ? t('er.arrive', { numero: achat.colis.numero }) : t('er.badge.recu');
  }
  if (achat.suivi) return phraseStatut(achat.suivi, t);
  return achat.message ? t('er.message.' + achat.message) : '';
}

export const CarteAchat = memo(function CarteAchat({ achat }) {
  const { t } = useLangue();
  const etat = etatAchat(achat);
  const s = achat.suivi;
  const phrase = phraseAchat(achat, t);
  const sousTitre = s && achat.statut !== 'recu'
    ? [s.transporteur_nom || t('er.transporteur_inconnu'), s.dernier_lieu].filter(Boolean).join(' · ')
    : '';
  return (
    <Pressable
      onPress={() => router.push('/achat/' + achat.id)}
      accessibilityRole="button"
      accessibilityLabel={[titreAchat(achat), t('er.badge.' + etat), phrase].filter(Boolean).join('. ')}
      style={({ pressed }) => [styles.carte, ombres.carte, pressed && { opacity: 0.85 }]}
      testID="achat-carte"
    >
      <View style={styles.tete}>
        <Texte gras taille={14.5} style={{ flex: 1 }} numberOfLines={2}>{titreAchat(achat)}</Texte>
        <PuceAchat etat={etat} />
      </View>
      {achat.numero_suivi ? (
        <Mono taille={11.5} couleur={couleurs.texteFaible} style={{ marginTop: 4 }} numberOfLines={1}>{achat.numero_suivi}</Mono>
      ) : null}
      {phrase ? <Texte gras={!!s || achat.statut === 'recu'} taille={13} style={{ marginTop: 9, lineHeight: 18 }} testID="achat-phrase">{phrase}</Texte> : null}
      {sousTitre ? <Texte doux taille={12} style={{ marginTop: 4 }} numberOfLines={1}>{sousTitre}</Texte> : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  carte: { backgroundColor: couleurs.carte, borderRadius: 18, borderWidth: 1, borderColor: couleurs.bord, padding: 14 },
  tete: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
});
