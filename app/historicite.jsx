// Historicité (Compte) : tous les colis livrés du client, les plus récents d'abord. C'est
// la mémoire de ce que l'accueil ne montre plus : un colis livré en sort, il se retrouve
// ici avec sa date de livraison.
//
// Même liste que « Mes colis » filtrée sur « livré » : la base filtre, cherche et rend la
// page (20 colis), l'application ne charge jamais tous les colis pour chercher dedans.
// Aucun chiffre n'est compté ici : le total est celui que la base rend avec la première page.

import { useEffect, useState } from 'react';
import { View, FlatList, Pressable, TextInput, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import EnTete from '../components/EnTete';
import { couleurs, polices, rayons } from '../lib/theme';
import { Texte, Chargement, Vide, EtatErreur, Bandeau } from '../components/ui';
import { CarteColis } from '../components/colis';
import { useLangue } from '../lib/i18n';
import { useSession } from '../lib/session';
import { useDonnees } from '../lib/useDonnees';
import { mesColis, surveiller } from '../lib/api';

export default function Historicite() {
  const { t } = useLangue();
  const { profil } = useSession();

  const [saisie, setSaisie] = useState('');
  const [recherche, setRecherche] = useState('');
  const [suite, setSuite] = useState({ lignes: [], page: 0, encore: false, charge: false });

  // La recherche part 400 ms après la dernière lettre tapée, pas à chaque lettre
  useEffect(() => {
    const minuteur = setTimeout(() => setRecherche(saisie), 400);
    return () => clearTimeout(minuteur);
  }, [saisie]);

  const { donnees, erreur, recharger, rafraichit, tirer, chargement } = useDonnees(
    () => mesColis({ page: 0, filtre: 'livres', recherche, livraison: true }), [recherche],
  );

  useEffect(() => {
    if (donnees) setSuite({ lignes: donnees.lignes, page: 0, encore: donnees.suite, charge: false });
  }, [donnees]);

  // Un colis que l'équipe vient de livrer s'ajoute à la liste sans qu'on la recharge
  useEffect(() => surveiller(profil?.id, recharger), [profil?.id, recharger]);

  async function pageSuivante() {
    if (!suite.encore || suite.charge) return;
    setSuite((s) => ({ ...s, charge: true }));
    try {
      const r = await mesColis({ page: suite.page + 1, filtre: 'livres', recherche, livraison: true });
      setSuite((s) => ({ lignes: s.lignes.concat(r.lignes), page: s.page + 1, encore: r.suite, charge: false }));
    } catch (e) {
      setSuite((s) => ({ ...s, charge: false, encore: false }));
    }
  }

  const total = donnees && donnees.total != null ? donnees.total : null;

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <EnTete
        titre={t('hi.titre')}
        retour
        bas={18}
        action={total != null ? (
          <Texte taille={11.5} style={{ fontFamily: polices.mono, color: couleurs.surNuit, letterSpacing: 1 }} testID="historicite-total">
            {total}
          </Texte>
        ) : null}
      >
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
            testID="historicite-recherche"
          />
          {saisie ? (
            <Pressable onPress={() => { setSaisie(''); setRecherche(''); }} hitSlop={10} accessibilityRole="button"
              accessibilityLabel={t('co.effacer')}>
              <Feather name="x" size={17} color={couleurs.surNuit} />
            </Pressable>
          ) : null}
        </View>
      </EnTete>

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
            recherche
              ? <Vide icone="search" titre={t('co.aucun_resultat')} testID="historicite-aucun-resultat" />
              : <Vide icone="clock" titre={t('hi.vide')} texte={t('hi.vide_texte')} testID="historicite-vide" />
          }
          ListFooterComponent={suite.charge ? <ActivityIndicator color={couleurs.accent} style={{ marginVertical: 18 }} /> : null}
          refreshControl={<RefreshControl refreshing={rafraichit} onRefresh={tirer} tintColor={couleurs.accent} />}
          testID="historicite-liste"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  recherche: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    marginTop: 15,
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
});
