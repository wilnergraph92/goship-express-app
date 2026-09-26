// Détail d'un colis : statut, informations et étapes.
//
// Les étapes sont les événements réellement enregistrés par la base (colis_historique),
// dans l'ordre où ils se sont produits : ceux que la règle de lecture montre au client
// (publics, jamais une étape annulée par une correction). Le statut affiché est celui
// du colis, tel que le moteur d'événements l'a fixé — l'application n'en déduit rien.

import { useEffect } from 'react';
import { View, ScrollView, Pressable, Linking, Share, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import config from '../../config';
import { couleurs, rayons, ombres, STATUTS } from '../../lib/theme';
import { Titre, Texte, Mono, Etiquette, Bouton, Chargement, EtatErreur, Bandeau } from '../../components/ui';
import { FriseLegendee } from '../../components/colis';
import { useLangue } from '../../lib/i18n';
import { useSession } from '../../lib/session';
import { useDonnees } from '../../lib/useDonnees';
import { unColis, surveiller } from '../../lib/api';
import { dateRelative, libelleStatut, libelleService, libellePays, poids } from '../../lib/format';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function DetailColis() {
  const { id } = useLocalSearchParams();
  const { t, langue } = useLangue();
  const { profil } = useSession();
  const marges = useSafeAreaInsets();

  const { donnees: colis, erreur, recharger, chargement } = useDonnees(async () => {
    // Un lien mal formé ne part même pas au serveur
    if (!UUID.test(String(id || ''))) {
      const e = new Error('introuvable');
      e.goship = { type: 'introuvable', code: 'INTROUVABLE', detail: '' };
      throw e;
    }
    const c = await unColis(String(id));
    // Aucune ligne : ce colis n'existe pas, ou il n'est pas à ce compte (la base ne le
    // montre pas) — les deux cas disent la même chose, sans rien révéler
    if (!c) {
      const e = new Error('introuvable');
      e.goship = { type: 'introuvable', code: 'INTROUVABLE', detail: '' };
      throw e;
    }
    return c;
  }, [id]);

  useEffect(() => surveiller(profil?.id, recharger), [profil?.id, recharger]);

  const s = colis ? (STATUTS[colis.statut] || STATUTS.recu) : STATUTS.recu;
  // Les étapes, de la plus récente à la plus ancienne
  const etapes = colis ? colis.historique.slice().reverse() : [];

  function ecrire() {
    const texte = `GoShip Express — ${colis?.numero || ''}`;
    Linking.openURL(`https://wa.me/${config.whatsapp}?text=${encodeURIComponent(texte)}`).catch(() => {});
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
            accessibilityLabel={t('gen.retour')}
            testID="retour"
          >
            <Feather name="arrow-left" size={20} color="#ffffff" />
          </Pressable>
          <Mono taille={14} couleur="#ffffff" testID="detail-numero">{colis?.numero || ''}</Mono>
          {colis ? (
            <Pressable
              onPress={() => Share.share({ message: `${colis.numero} — ${libelleStatut(colis.statut, langue)}` })}
              style={styles.rond}
              accessibilityRole="button"
              accessibilityLabel={t('gen.partager')}
            >
              <Feather name="share-2" size={18} color="#ffffff" />
            </Pressable>
          ) : <View style={{ width: 44 }} />}
        </View>
      </View>

      {colis ? <Bandeau erreur={erreur} onReessayer={recharger} /> : null}

      {chargement ? (
        <Chargement />
      ) : !colis ? (
        <View style={{ paddingTop: 20 }}><EtatErreur erreur={erreur} onReessayer={recharger} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          <View style={[styles.carteStatut, ombres.carte]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
              <View style={[styles.rondStatut, { backgroundColor: s.fond }]}>
                <Feather name={colis.statut === 'incident' ? 'alert-triangle' : 'package'} size={22} color={s.couleur} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Titre taille={18} testID="detail-statut">{libelleStatut(colis.statut, langue)}</Titre>
                <Texte doux taille={12.5}>
                  {dateRelative(colis.maj_le, langue)}{colis.lieu ? ` · ${colis.lieu}` : ''}
                </Texte>
              </View>
            </View>
            <View style={{ marginTop: 16 }}>
              <FriseLegendee statut={colis.statut} historique={colis.historique} />
            </View>
            {colis.note ? (
              <View style={[styles.note, colis.statut === 'incident' && styles.noteAlerte]}>
                <Texte taille={12.5} doux style={{ lineHeight: 19 }}>{colis.note}</Texte>
              </View>
            ) : null}
          </View>

          <View style={styles.grille}>
            {colis.description ? <Info etiquette={t('pa.contenu')} valeur={colis.description} large /> : null}
            <Info etiquette={t('de.poids')} valeur={poids(colis.poids_lb, langue)} />
            <Info etiquette={t('de.service')} valeur={libelleService(colis.service, langue)} />
            {colis.expediteur ? <Info etiquette={t('de.magasin')} valeur={colis.expediteur} /> : null}
            <Info etiquette={t('de.destination')} valeur={colis.destination || libellePays(colis.pays_destination, langue)} />
            {colis.suivi_transporteur ? <Info etiquette={t('de.suivi_magasin')} valeur={colis.suivi_transporteur} large mono /> : null}
          </View>

          <View style={[styles.carteEtapes, ombres.carte]} testID="detail-etapes">
            <Titre taille={15.5} style={{ marginBottom: 14 }}>{t('de.etapes')}</Titre>
            {etapes.length === 0 ? (
              <Texte doux taille={13}>{t('de.aucune_etape')}</Texte>
            ) : (
              etapes.map((etape, index) => {
                const premier = index === 0;
                const dernier = index === etapes.length - 1;
                const c = STATUTS[etape.statut] || STATUTS.recu;
                return (
                  <View key={etape.id ?? index} style={{ flexDirection: 'row', gap: 14 }} accessible
                    accessibilityLabel={[libelleStatut(etape.statut, langue), dateRelative(etape.cree_le, langue), etape.lieu, etape.note].filter(Boolean).join(', ')}>
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
                      <Texte gras taille={14} testID="etape">{libelleStatut(etape.statut, langue)}</Texte>
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

function Info({ etiquette, valeur, large, mono }) {
  return (
    <View style={[styles.info, large && { width: '100%' }]}>
      <Etiquette>{etiquette}</Etiquette>
      {mono
        ? <Mono taille={13.5} style={{ marginTop: 5 }} selectable>{valeur}</Mono>
        : <Texte gras taille={14.5} style={{ marginTop: 5 }} numberOfLines={large ? 3 : 1}>{valeur}</Texte>}
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
  noteAlerte: { backgroundColor: 'rgba(220,38,38,0.07)' },
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
