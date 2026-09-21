// Éléments propres aux colis : puce de statut, frise des étapes, carte de la liste.

import { View, Pressable, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { couleurs, polices, rayons, ombres, STATUTS, ETAPES } from '../lib/theme';
import { Texte, Mono } from './ui';
import { useLangue } from '../lib/i18n';
import { dateRelative, libelleStatut, libelleService, poids } from '../lib/format';

export function PuceStatut({ statut, style }) {
  const { t, langue } = useLangue();
  const s = STATUTS[statut] || STATUTS.recu;
  return (
    <View style={[{ backgroundColor: s.fond, borderRadius: rayons.pastille, paddingHorizontal: 11, paddingVertical: 5 }, style]}>
      <Texte gras taille={11.5} style={{ color: s.couleur }}>{libelleStatut(statut, langue) || t('statut.recu')}</Texte>
    </View>
  );
}

export function Frise({ statut, hauteur = 4 }) {
  const s = STATUTS[statut] || STATUTS.recu;
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {Array.from({ length: ETAPES }, (_, i) => i + 1).map((n) => (
        <View
          key={n}
          style={{
            flex: 1,
            height: hauteur,
            borderRadius: hauteur / 2,
            backgroundColor: n <= s.etape ? s.barre : '#e6ebf5',
          }}
        />
      ))}
    </View>
  );
}

export function FriseLegendee({ statut }) {
  const { t } = useLangue();
  const s = STATUTS[statut] || STATUTS.recu;
  return (
    <View style={{ gap: 9 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Texte taille={11.5} style={{ fontFamily: polices.mono, color: couleurs.texteFaible, letterSpacing: 0.6 }}>
          {t('de.etape_sur', { n: s.etape, total: ETAPES })}
        </Texte>
        <Texte gras taille={12} style={{ color: s.couleur }}>{t('etape.' + s.etape)}</Texte>
      </View>
      <Frise statut={statut} hauteur={5} />
    </View>
  );
}

export function CarteColis({ colis }) {
  const { t, langue } = useLangue();
  const details = [colis.expediteur, poids(colis.poids_lb, langue), libelleService(colis.service, langue)]
    .filter(Boolean)
    .join(' · ');

  return (
    <Link href={'/colis/' + colis.id} asChild>
      <Pressable style={({ pressed }) => [styles.carte, ombres.carte, pressed && { opacity: 0.9 }]}>
        <View style={styles.ligneHaut}>
          <Mono taille={13}>{colis.numero}</Mono>
          <PuceStatut statut={colis.statut} />
        </View>
        {colis.description ? (
          <Texte gras taille={14.5} style={{ marginTop: 9 }} numberOfLines={1}>{colis.description}</Texte>
        ) : null}
        {details ? <Texte doux taille={12.5} style={{ marginTop: 3 }} numberOfLines={1}>{details}</Texte> : null}
        <View style={{ marginTop: 12 }}>
          <Frise statut={colis.statut} />
        </View>
        <Texte doux taille={11.5} style={{ marginTop: 9, color: couleurs.texteFaible }}>
          {t('co.maj')} {dateRelative(colis.maj_le, langue)}
        </Texte>
      </Pressable>
    </Link>
  );
}

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
