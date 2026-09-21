// Détail d'un colis : statut, informations et étapes.

import { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, Pressable, Linking, Share, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import config from '../../config';
import { couleurs, rayons, ombres, STATUTS } from '../../lib/theme';
import { Titre, Texte, Mono, Etiquette, Bouton, Chargement } from '../../components/ui';
import { FriseLegendee } from '../../components/colis';
import { useLangue } from '../../lib/i18n';
import { useSession } from '../../lib/session';
import { unColis, surveillerColis } from '../../lib/api';
import { dateRelative, libelleStatut, libelleService, libellePays, poids } from '../../lib/format';

export default function DetailColis() {
  const { id } = useLocalSearchParams();
  const { t, langue } = useLangue();
  const { profil } = useSession();
  const marges = useSafeAreaInsets();
  const [colis, setColis] = useState(null);

  const charger = useCallback(async () => {
    try {
      setColis(await unColis(String(id)));
    } catch (e) {
      setColis(false);
    }
  }, [id]);

  useEffect(() => { charger(); }, [charger]);
  useEffect(() => {
    if (!profil?.id) return undefined;
    return surveillerColis(profil.id, charger);
  }, [profil?.id, charger]);

  const s = colis ? (STATUTS[colis.statut] || STATUTS.recu) : STATUTS.recu;

  function ecrire() {
    const texte = `GoShip Express — ${colis?.numero || ''}`;
    Linking.openURL(`https://wa.me/${config.whatsapp}?text=${encodeURIComponent(texte)}`);
  }

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <View style={[styles.entete, { paddingTop: marges.top + 14 }]}>
        <View style={styles.halo} pointerEvents="none" />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(onglets)/colis'))}
            style={styles.rond}
            accessibilityRole="button"
            accessibilityLabel={t('co.titre')}
          >
            <Feather name="arrow-left" size={20} color="#ffffff" />
          </Pressable>
          <Mono taille={14} couleur="#ffffff">{colis?.numero || ''}</Mono>
          <Pressable
            onPress={() => Share.share({ message: `${colis?.numero || ''} — ${libelleStatut(colis?.statut || 'recu', langue)}` })}
            style={styles.rond}
            accessibilityRole="button"
            accessibilityLabel={t('gen.partager')}
          >
            <Feather name="share-2" size={18} color="#ffffff" />
          </Pressable>
        </View>
      </View>

      {colis === null ? (
        <Chargement />
      ) : !colis ? (
        <View style={{ padding: 24 }}>
          <Texte doux>{t('gen.erreur')}</Texte>
          <Bouton titre={t('gen.reessayer')} onPress={charger} style={{ marginTop: 16 }} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          <View style={[styles.carteStatut, ombres.carte]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
              <View style={[styles.rondStatut, { backgroundColor: s.fond }]}>
                <Feather name="package" size={22} color={s.couleur} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Titre taille={18}>{libelleStatut(colis.statut, langue)}</Titre>
                <Texte doux taille={12.5}>
                  {dateRelative(colis.maj_le, langue)}{colis.lieu ? ` · ${colis.lieu}` : ''}
                </Texte>
              </View>
            </View>
            <View style={{ marginTop: 16 }}>
              <FriseLegendee statut={colis.statut} />
            </View>
            {colis.note ? (
              <View style={styles.note}>
                <Texte taille={12.5} doux style={{ lineHeight: 19 }}>{colis.note}</Texte>
              </View>
            ) : null}
          </View>

          <View style={styles.grille}>
            <Info etiquette={t('de.poids')} valeur={poids(colis.poids_lb, langue)} />
            <Info etiquette={t('de.service')} valeur={libelleService(colis.service, langue)} />
            <Info etiquette={t('de.magasin')} valeur={colis.expediteur || '—'} />
            <Info etiquette={t('de.destination')} valeur={colis.destination || libellePays(colis.pays_destination, langue)} />
          </View>

          <View style={[styles.carteEtapes, ombres.carte]}>
            <Titre taille={15.5} style={{ marginBottom: 14 }}>{t('de.etapes')}</Titre>
            {(colis.historique || []).length === 0 ? (
              <Texte doux taille={13}>{t('de.aucune_etape')}</Texte>
            ) : (
              colis.historique.map((etape, index) => {
                const premier = index === 0;
                const dernier = index === colis.historique.length - 1;
                const c = STATUTS[etape.statut] || STATUTS.recu;
                return (
                  <View key={index} style={{ flexDirection: 'row', gap: 14 }}>
                    <View style={{ alignItems: 'center' }}>
                      <View
                        style={[
                          styles.point,
                          premier
                            ? { backgroundColor: c.barre, borderColor: c.fond, borderWidth: 4 }
                            : { backgroundColor: '#ffffff', borderColor: '#cdd6e8', borderWidth: 2.5 },
                        ]}
                      />
                      {!dernier ? <View style={styles.fil} /> : null}
                    </View>
                    <View style={{ flex: 1, paddingBottom: dernier ? 4 : 16 }}>
                      <Texte gras taille={14}>{libelleStatut(etape.statut, langue)}</Texte>
                      <Texte doux taille={12.5} style={{ marginTop: 2 }}>
                        {dateRelative(etape.cree_le, langue)}{etape.lieu ? ` · ${etape.lieu}` : ''}
                      </Texte>
                      {etape.note ? (
                        <View style={styles.note}>
                          <Texte taille={12.5} doux style={{ lineHeight: 19 }}>{etape.note}</Texte>
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      )}

      <View style={[styles.barreBas, { paddingBottom: Math.max(marges.bottom, 14) }]}>
        <Bouton titre={t('de.whatsapp')} icone="message-circle" variante="sombre" onPress={ecrire} style={{ flex: 1 }} />
        <Pressable
          onPress={() => router.push('/agences')}
          style={styles.rondClair}
          accessibilityRole="button"
          accessibilityLabel={t('ag.titre')}
        >
          <Feather name="map-pin" size={20} color={couleurs.texte} />
        </Pressable>
      </View>
    </View>
  );
}

function Info({ etiquette, valeur }) {
  return (
    <View style={styles.info}>
      <Etiquette>{etiquette}</Etiquette>
      <Texte gras taille={14.5} style={{ marginTop: 5 }} numberOfLines={1}>{valeur}</Texte>
    </View>
  );
}

const styles = StyleSheet.create({
  entete: { backgroundColor: couleurs.nuit, paddingHorizontal: 18, paddingBottom: 46, overflow: 'hidden' },
  halo: { position: 'absolute', top: -90, right: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(244,96,13,0.18)' },
  rond: { width: 44, height: 44, borderRadius: 14, backgroundColor: couleurs.voileClair, alignItems: 'center', justifyContent: 'center' },
  rondClair: { width: 52, height: 52, borderRadius: rayons.bouton, borderWidth: 1.5, borderColor: couleurs.bordFort, alignItems: 'center', justifyContent: 'center' },
  carteStatut: {
    marginHorizontal: 18,
    marginTop: -34,
    backgroundColor: couleurs.carte,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: couleurs.bord,
    padding: 18,
  },
  rondStatut: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  grille: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginHorizontal: 18, marginTop: 14 },
  info: {
    width: '47.8%',
    flexGrow: 1,
    backgroundColor: couleurs.carte,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: couleurs.bord,
    padding: 12,
  },
  carteEtapes: {
    marginHorizontal: 18,
    marginTop: 16,
    backgroundColor: couleurs.carte,
    borderRadius: rayons.carte,
    borderWidth: 1,
    borderColor: couleurs.bord,
    padding: 18,
  },
  point: { width: 13, height: 13, borderRadius: 7 },
  fil: { flex: 1, width: 2, backgroundColor: '#edf1f8', marginVertical: 2 },
  note: { marginTop: 8, backgroundColor: '#f7f9fd', borderRadius: 12, padding: 10 },
  barreBas: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 14,
    backgroundColor: couleurs.carte,
    borderTopWidth: 1,
    borderTopColor: '#e9eef7',
  },
});
