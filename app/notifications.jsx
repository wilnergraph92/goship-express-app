// Mes notifications : celles que la base a écrites à chaque étape d'un colis, d'une
// facture ou d'un paiement (outils/supabase-notifications.sql du site). Traduites
// par la base dans la langue de l'application, comptées par elle (le badge), les
// mêmes que sur le site. Toucher une notification la marque lue et ouvre son colis
// ou sa facture.

import { useState } from 'react';
import { View, FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import EnTete from '../components/EnTete';
import { couleurs, rayons, ombres } from '../lib/theme';
import { Texte, Chargement, EtatErreur, Vide } from '../components/ui';
import { useLangue } from '../lib/i18n';
import { useDonnees } from '../lib/useDonnees';
import { mesNotifications, marquerNotificationsLues } from '../lib/api';
import { dateRelative } from '../lib/format';

const FILTRES = ['toutes', 'non_lues', 'colis', 'factures', 'paiements'];
const ICONES = { colis: 'package', factures: 'file-text', paiements: 'credit-card', compte: 'bell' };

export default function Notifications() {
  const { t, langue } = useLangue();
  const marges = useSafeAreaInsets();
  const [filtre, setFiltre] = useState('toutes');
  const [parPage, setParPage] = useState(20);

  const { donnees, setDonnees, erreur, recharger, rafraichit, tirer, chargement } = useDonnees(
    () => mesNotifications({ filtre, parPage, langue }), [filtre, parPage, langue]);

  const ouvrir = (n) => {
    if (!n.lu) {
      // Tout de suite à l'écran ; la base confirme au rechargement
      setDonnees((d) => d && {
        ...d, non_lues: Math.max(0, d.non_lues - 1),
        elements: d.elements.map((x) => (x.id === n.id ? { ...x, lu: true } : x)),
      });
      marquerNotificationsLues([n.id]).catch(() => {});
    }
    if (n.colis_id) router.push('/colis/' + n.colis_id);
    else if (n.facture_id) router.push('/facture/' + n.facture_id);
  };

  const toutLu = async () => {
    try { await marquerNotificationsLues(); } catch (e) { /* le rechargement dira la vérité */ }
    recharger();
  };

  const nonLues = donnees ? donnees.non_lues : 0;

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <EnTete titre={t('no.titre')} retour arrondi={false} bas={14}>
        <View style={styles.filtres}>
          {FILTRES.map((f) => (
            <Pressable key={f} onPress={() => { setFiltre(f); setParPage(20); }}
              style={[styles.filtre, filtre === f && styles.filtreActif]} accessibilityRole="button"
              accessibilityState={{ selected: filtre === f }} testID={'notifs-filtre-' + f}>
              <Texte gras taille={12.5} style={{ color: filtre === f ? couleurs.nuit : '#ffffff' }}>{t('no.f.' + f)}</Texte>
            </Pressable>
          ))}
        </View>
      </EnTete>

      {chargement ? (
        <Chargement />
      ) : !donnees ? (
        <EtatErreur erreur={erreur} onReessayer={recharger} />
      ) : (
        <FlatList
          data={donnees.elements}
          keyExtractor={(n) => String(n.id)}
          testID="notifs-liste"
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: marges.bottom + 30 }}
          refreshControl={<RefreshControl refreshing={rafraichit} onRefresh={tirer} tintColor={couleurs.accent} />}
          ListHeaderComponent={nonLues > 0 ? (
            <Pressable onPress={toutLu} style={styles.toutLu} accessibilityRole="button" testID="notifs-tout-lu">
              <Feather name="check-circle" size={16} color={couleurs.accent} />
              <Texte gras taille={13.5}>{t('no.tout_lu')} ({nonLues})</Texte>
            </Pressable>
          ) : null}
          ListEmptyComponent={<Vide icone="bell" titre={t('no.vide')} texte={t('no.vide_texte')} testID="notifs-vide" />}
          ListFooterComponent={donnees.total > donnees.elements.length ? (
            <Pressable onPress={() => setParPage((n) => n + 20)} style={styles.plus} accessibilityRole="button" testID="notifs-plus">
              <Texte gras taille={13.5}>{t('no.plus')}</Texte>
            </Pressable>
          ) : null}
          renderItem={({ item: n }) => (
            <Pressable onPress={() => ouvrir(n)} style={[styles.carte, ombres.carte, !n.lu && styles.nonLue]}
              accessibilityRole="button" accessibilityLabel={(n.lu ? '' : t('no.nouvelle') + ', ') + n.titre + ', ' + n.message}
              testID={'notif-' + n.id}>
              <View style={[styles.rond, n.priorite === 'haute' && { backgroundColor: 'rgba(244,96,13,0.14)' }]}>
                <Feather name={ICONES[n.categorie] || 'bell'} size={18}
                  color={n.priorite === 'haute' ? couleurs.accent : couleurs.texte} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <Texte gras taille={14.5} style={{ flexShrink: 1 }}>{n.titre}</Texte>
                  {!n.lu ? <View style={styles.point} testID={'notif-non-lue-' + n.id} /> : null}
                </View>
                <Texte doux taille={13.5} style={{ lineHeight: 19 }}>{n.message}</Texte>
                <Texte doux taille={12}>{dateRelative(n.date, langue)}</Texte>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  filtres: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 14 },
  filtre: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  filtreActif: { backgroundColor: '#ffffff', borderColor: '#ffffff' },
  carte: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: rayons.carte, backgroundColor: couleurs.carte },
  nonLue: { backgroundColor: '#fff6f0' },
  rond: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: couleurs.fond },
  point: { width: 9, height: 9, borderRadius: 5, backgroundColor: couleurs.accent },
  toutLu: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-end', paddingVertical: 6 },
  plus: { alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 18 },
});
