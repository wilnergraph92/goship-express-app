// Liste des colis du client, avec recherche, filtres et scan d'une étiquette.
//
// La liste arrive page par page (20 colis) et c'est la base qui filtre et qui cherche :
// l'application ne charge jamais tous les colis pour chercher dedans, qu'il y en ait
// 10 ou 10 000.

import { useCallback, useEffect, useRef, useState } from 'react';
import { View, FlatList, Pressable, TextInput, RefreshControl, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { couleurs, polices, rayons } from '../../lib/theme';
import { Titre, Texte, Chargement, Vide, EtatErreur, Bandeau } from '../../components/ui';
import { CarteColis } from '../../components/colis';
import { useLangue } from '../../lib/i18n';
import { useSession } from '../../lib/session';
import { useDonnees } from '../../lib/useDonnees';
import { mesColis, surveiller } from '../../lib/api';

const FILTRES = [
  { id: 'tous', cle: 'co.tous' },
  { id: 'route', cle: 'co.en_route' },
  { id: 'retirer', cle: 'co.a_retirer' },
  { id: 'livres', cle: 'co.livres' },
  { id: 'action', cle: 'co.action' },
];

export default function MesColis() {
  const { t } = useLangue();
  const { profil } = useSession();
  const marges = useSafeAreaInsets();

  const [saisie, setSaisie] = useState('');
  const [recherche, setRecherche] = useState('');
  const [filtre, setFiltre] = useState('tous');
  const [suite, setSuite] = useState({ lignes: [], page: 0, encore: false, charge: false });
  const premier = useRef(true);

  // La recherche part 400 ms après la dernière lettre tapée, pas à chaque lettre
  useEffect(() => {
    const minuteur = setTimeout(() => setRecherche(saisie), 400);
    return () => clearTimeout(minuteur);
  }, [saisie]);

  const { donnees, erreur, recharger, rafraichit, tirer, chargement } = useDonnees(
    () => mesColis({ page: 0, filtre, recherche }), [filtre, recherche],
  );

  useEffect(() => {
    if (donnees) setSuite({ lignes: donnees.lignes, page: 0, encore: donnees.suite, charge: false });
  }, [donnees]);

  useFocusEffect(useCallback(() => {
    if (premier.current) { premier.current = false; return; }
    recharger();
  }, [recharger]));
  useEffect(() => surveiller(profil?.id, recharger), [profil?.id, recharger]);

  async function pageSuivante() {
    if (!suite.encore || suite.charge) return;
    setSuite((s) => ({ ...s, charge: true }));
    try {
      const r = await mesColis({ page: suite.page + 1, filtre, recherche });
      setSuite((s) => ({ lignes: s.lignes.concat(r.lignes), page: s.page + 1, encore: r.suite, charge: false }));
    } catch (e) {
      setSuite((s) => ({ ...s, charge: false, encore: false }));
    }
  }

  const total = donnees && donnees.total != null ? donnees.total : null;

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <View style={[styles.entete, { paddingTop: marges.top + 16 }]}>
        <View style={styles.halo} pointerEvents="none" />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Titre taille={23} couleur="#ffffff">{t('co.titre')}</Titre>
          {total != null ? (
            <Texte taille={11.5} style={{ fontFamily: polices.mono, color: couleurs.surNuit, letterSpacing: 1 }} testID="colis-total">
              {total}
            </Texte>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', gap: 9, marginTop: 15 }}>
          <View style={styles.recherche}>
            <Feather name="search" size={18} color={couleurs.surNuit} />
            <TextInput
              value={saisie}
              onChangeText={setSaisie}
              placeholder={t('co.recherche')}
              placeholderTextColor={couleurs.surNuit}
              style={styles.champRecherche}
              accessibilityLabel={t('co.recherche')}
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => setRecherche(saisie)}
              testID="colis-recherche"
            />
            {saisie ? (
              <Pressable onPress={() => { setSaisie(''); setRecherche(''); }} hitSlop={10} accessibilityRole="button"
                accessibilityLabel={t('co.effacer')}>
                <Feather name="x" size={17} color={couleurs.surNuit} />
              </Pressable>
            ) : null}
          </View>
          <Pressable
            onPress={() => router.push({ pathname: '/scanner', params: { mode: 'colis' } })}
            style={styles.scan}
            accessibilityRole="button"
            accessibilityLabel={t('co.scanner')}
            testID="colis-scanner"
          >
            <Feather name="maximize" size={20} color="#ffffff" />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 14 }}>
          {FILTRES.map((f) => {
            const actif = filtre === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => setFiltre(f.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: actif }}
                style={[styles.puce, { backgroundColor: actif ? couleurs.accent : couleurs.voileClair }]}
                testID={'filtre-' + f.id}
              >
                <Texte gras taille={12.5} style={{ color: actif ? '#ffffff' : '#dbe4f6' }}>{t(f.cle)}</Texte>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {donnees ? <Bandeau erreur={erreur} onReessayer={recharger} /> : null}

      {chargement ? (
        <Chargement texte={t('co.chargement')} />
      ) : !donnees ? (
        <EtatErreur erreur={erreur} onReessayer={recharger} />
      ) : (
        <FlatList
          data={suite.lignes}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <CarteColis colis={item} />}
          contentContainerStyle={{ padding: 18, gap: 11, paddingBottom: 30 }}
          onEndReached={pageSuivante}
          onEndReachedThreshold={0.5}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={9}
          removeClippedSubviews
          ListEmptyComponent={
            recherche || filtre !== 'tous'
              ? <Vide icone="search" titre={t('co.aucun_resultat')} />
              : <Vide titre={t('co.vide')} texte={t('co.vide_texte')} />
          }
          ListFooterComponent={suite.charge ? <ActivityIndicator color={couleurs.accent} style={{ marginVertical: 18 }} /> : null}
          refreshControl={<RefreshControl refreshing={rafraichit} onRefresh={tirer} tintColor={couleurs.accent} />}
          testID="colis-liste"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  entete: {
    backgroundColor: couleurs.nuit,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  halo: { position: 'absolute', top: -80, left: -50, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(244,96,13,0.16)' },
  recherche: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    paddingHorizontal: 15,
    borderRadius: rayons.champ,
    backgroundColor: couleurs.voileClair,
  },
  champRecherche: {
    flex: 1,
    height: 48,
    color: '#ffffff',
    fontFamily: polices.corps,
    fontSize: 14,
  },
  scan: { width: 48, height: 48, borderRadius: rayons.champ, backgroundColor: couleurs.accent, alignItems: 'center', justifyContent: 'center' },
  puce: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: rayons.pastille, minHeight: 36, justifyContent: 'center' },
});
