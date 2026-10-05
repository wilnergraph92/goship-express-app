// Éléments propres aux colis : puce de statut, frise des étapes, carte de la liste.

import { memo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { couleurs, polices, rayons, ombres, STATUTS, ETAPES } from '../lib/theme';
import { Texte, Mono } from './ui';
import { useLangue } from '../lib/i18n';
import { dateCourte, dateRelative, libelleStatut, libelleService, poids, etapeDe } from '../lib/format';

export function PuceStatut({ statut, style }) {
  const { t, langue } = useLangue();
  const s = STATUTS[statut] || STATUTS.recu;
  return (
    <View style={[{ backgroundColor: s.fond, borderRadius: rayons.pastille, paddingHorizontal: 11, paddingVertical: 5 }, style]}>
      <Texte gras taille={11.5} style={{ color: s.couleur }}>{libelleStatut(statut, langue) || t('statut.recu')}</Texte>
    </View>
  );
}

// La frise : l'étape vient du statut, ou de la dernière étape atteinte pour un
// colis en « action requise » (la barre est alors rouge)
export function Frise({ statut, historique, hauteur = 4 }) {
  const s = STATUTS[statut] || STATUTS.recu;
  const etape = etapeDe(statut, historique);
  return (
    <View style={{ flexDirection: 'row', gap: 3 }} accessible={false} importantForAccessibility="no-hide-descendants">
      {Array.from({ length: ETAPES }, (_, i) => i + 1).map((n) => (
        <View
          key={n}
          style={{
            flex: 1,
            height: hauteur,
            borderRadius: hauteur / 2,
            backgroundColor: n <= etape ? s.barre : '#e6ebf5',
          }}
        />
      ))}
    </View>
  );
}

export function FriseLegendee({ statut, historique }) {
  const { t } = useLangue();
  const s = STATUTS[statut] || STATUTS.recu;
  const etape = etapeDe(statut, historique);
  const texte = t('de.etape_sur', { n: etape, total: ETAPES });
  return (
    <View style={{ gap: 9 }} accessible accessibilityLabel={`${texte} · ${t('etape.' + etape)}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Texte taille={11.5} style={{ fontFamily: polices.mono, color: couleurs.texteFaible, letterSpacing: 0.6 }}>
          {texte}
        </Texte>
        <Texte gras taille={12} style={{ color: s.couleur }}>{t('etape.' + etape)}</Texte>
      </View>
      <Frise statut={statut} historique={historique} hauteur={5} />
    </View>
  );
}

// memo : une longue liste ne redessine pas toutes ses cartes à chaque page chargée.
// Un Pressable qui ouvre le colis, pas un <Link asChild> : le lien remplaçait le style
// calculé de la carte (fond blanc, bord, ombre, marges), et la carte n'en avait plus.
// sansDate : l'accueil, comme le téléphone du site, n'écrit pas « Mis à jour … ».
// Le numéro de suivi du vendeur (Amazon, SHEIN…) s'affiche quand le colis en a un :
// c'est celui que le client connaît. Un colis qui porte sa date de livraison (livre_le,
// l'historique) dit « Livré le … » à la place de « Mis à jour … ».
export const CarteColis = memo(function CarteColis({ colis, sansDate }) {
  const { t, langue } = useLangue();
  const details = [colis.expediteur, poids(colis.poids_lb, langue), libelleService(colis.service, langue)]
    .filter((v) => v && v !== '—')
    .join(' · ');
  const statut = libelleStatut(colis.statut, langue);

  return (
    <Pressable
      onPress={() => router.push('/colis/' + colis.id)}
      style={({ pressed }) => [styles.carte, ombres.carte, pressed && { opacity: 0.9 }]}
      accessibilityRole="button"
      accessibilityLabel={[colis.numero, statut, colis.description].filter(Boolean).join(', ')}
      testID={'colis-' + colis.numero}
    >
      <View style={styles.ligneHaut}>
        <Mono taille={13}>{colis.numero}</Mono>
        <PuceStatut statut={colis.statut} />
      </View>
      {colis.description ? (
        <Texte gras taille={14.5} style={{ marginTop: 9 }} numberOfLines={1}>{colis.description}</Texte>
      ) : null}
      {details ? <Texte doux taille={12.5} style={{ marginTop: 3 }} numberOfLines={1}>{details}</Texte> : null}
      {colis.suivi_transporteur ? (
        <Texte doux taille={12} style={{ marginTop: 3 }} numberOfLines={1} testID={'suivi-' + colis.numero}>
          {t('co.suivi_vendeur')} : <Texte taille={12} style={{ fontFamily: polices.mono, color: couleurs.texte }}>{colis.suivi_transporteur}</Texte>
        </Texte>
      ) : null}
      <View style={{ marginTop: 12 }}>
        <Frise statut={colis.statut} />
      </View>
      {sansDate ? null : (
        <Texte doux taille={11.5} style={{ marginTop: 9, color: couleurs.texteFaible }} testID={'date-' + colis.numero}>
          {colis.livre_le
            ? `${t('co.livre_le')} ${dateCourte(colis.livre_le, langue)}`
            : `${t('co.maj')} ${dateRelative(colis.maj_le, langue, true)}`}
        </Texte>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  carte: {
    backgroundColor: couleurs.carte,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: couleurs.bord,
    padding: 15,
  },
  ligneHaut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
});
