// Liste des colis du client, avec recherche et filtres.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, FlatList, Pressable, TextInput, RefreshControl, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { couleurs, polices, rayons } from '../../lib/theme';
import { Titre, Texte, Chargement, Vide } from '../../components/ui';
import { CarteColis } from '../../components/colis';
import { useLangue } from '../../lib/i18n';
import { useSession } from '../../lib/session';
import { mesColis, surveillerColis } from '../../lib/api';

const FILTRES = [
  { id: 'tous', cle: 'co.tous', statuts: null },
  { id: 'route', cle: 'co.en_route', statuts: ['recu', 'emballe', 'embarque', 'distribution', 'succursale'] },
  { id: 'retirer', cle: 'co.a_retirer', statuts: ['disponible'] },
  { id: 'livres', cle: 'co.livres', statuts: ['livre'] },
];

export default function MesColis() {
  const { t } = useLangue();
  const { profil } = useSession();
  const marges = useSafeAreaInsets();

  const [colis, setColis] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [filtre, setFiltre] = useState('tous');
  const [rafraichit, setRafraichit] = useState(false);

  const charger = useCallback(async () => {
    try {
      setColis(await mesColis());
    } catch (e) {
      setColis([]);
    }
  }, []);

  useFocusEffect(useCallback(() => { charger(); }, [charger]));

  useEffect(() => {
    if (!profil?.id) return undefined;
    return surveillerColis(profil.id, charger);
  }, [profil?.id, charger]);

  const liste = useMemo(() => {
    const cherche = recherche.trim().toLowerCase();
    const def = FILTRES.find((f) => f.id === filtre);
    return (colis || []).filter((c) => {
      if (def?.statuts && !def.statuts.includes(c.statut)) return false;
      if (!cherche) return true;
      return [c.numero, c.description, c.expediteur, c.suivi_transporteur, c.destination]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(cherche));
    });
  }, [colis, recherche, filtre]);

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <View style={[styles.entete, { paddingTop: marges.top + 16 }]}>
        <View style={styles.halo} pointerEvents="none" />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Titre taille={23} couleur="#ffffff">{t('co.titre')}</Titre>
          <Texte taille={11.5} style={{ fontFamily: polices.mono, color: couleurs.surNuit, letterSpacing: 1 }}>
            {(colis || []).length}
          </Texte>
        </View>

        <View style={styles.recherche}>
          <Feather name="search" size={18} color={couleurs.surNuit} />
          <TextInput
            value={recherche}
            onChangeText={setRecherche}
            placeholder={t('co.recherche')}
            placeholderTextColor={couleurs.surNuit}
            style={styles.champRecherche}
            accessibilityLabel={t('co.recherche')}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          {FILTRES.map((f) => {
            const actif = filtre === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => setFiltre(f.id)}
                accessibilityRole="button"
                style={[styles.puce, { backgroundColor: actif ? couleurs.accent : couleurs.voileClair }]}
              >
                <Texte gras taille={12.5} style={{ color: actif ? '#ffffff' : '#dbe4f6' }}>{t(f.cle)}</Texte>
              </Pressable>
            );
          })}
        </View>
      </View>

      {colis === null ? (
        <Chargement />
      ) : (
        <FlatList
          data={liste}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <CarteColis colis={item} />}
          contentContainerStyle={{ padding: 18, gap: 11, paddingBottom: 30 }}
          ListEmptyComponent={<Vide titre={t('co.vide')} texte={t('co.vide_texte')} />}
          refreshControl={
            <RefreshControl
              refreshing={rafraichit}
              onRefresh={async () => { setRafraichit(true); await charger(); setRafraichit(false); }}
              tintColor={couleurs.accent}
            />
          }
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 15,
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
  puce: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: rayons.pastille },
});
