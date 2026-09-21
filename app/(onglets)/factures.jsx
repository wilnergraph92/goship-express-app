// Factures et solde à payer.

import { useCallback, useState } from 'react';
import { View, ScrollView, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import config from '../../config';
import { couleurs, rayons, ombres } from '../../lib/theme';
import { Titre, Texte, Mono, Etiquette, Bouton, Vide } from '../../components/ui';
import { useLangue } from '../../lib/i18n';
import { mesFactures } from '../../lib/api';
import { dateCourte, montant } from '../../lib/format';

export default function Factures() {
  if (!config.modules.factures) return <Redirect href="/(onglets)" />;

  const { t, langue } = useLangue();
  const marges = useSafeAreaInsets();
  const [factures, setFactures] = useState([]);
  const [onglet, setOnglet] = useState('a_payer');
  const [rafraichit, setRafraichit] = useState(false);

  const charger = useCallback(async () => {
    try {
      setFactures(await mesFactures());
    } catch (e) {
      setFactures([]); // la table n'existe pas encore
    }
  }, []);

  useFocusEffect(useCallback(() => { charger(); }, [charger]));

  const aPayer = factures.filter((f) => f.statut === 'a_payer');
  const payees = factures.filter((f) => f.statut === 'payee');
  const solde = aPayer.reduce((total, f) => total + Number(f.montant_usd || 0), 0);
  const liste = onglet === 'a_payer' ? aPayer : payees;

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <View style={[styles.entete, { paddingTop: marges.top + 16 }]}>
        <View style={styles.halo} pointerEvents="none" />
        <Titre taille={23} couleur="#ffffff">{t('fa.titre')}</Titre>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={
          <RefreshControl
            refreshing={rafraichit}
            onRefresh={async () => { setRafraichit(true); await charger(); setRafraichit(false); }}
            tintColor={couleurs.accent}
          />
        }
      >
        <View style={[styles.carteSolde, ombres.carte]}>
          <Etiquette>{t('fa.solde')}</Etiquette>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 6 }}>
            <Titre taille={34}>{montant(solde, langue)}</Titre>
            {aPayer.length > 0 ? (
              <View style={styles.pucePaiement}>
                <Texte gras taille={11.5} style={{ color: '#c4500b' }}>{aPayer.length} {t('fa.en_attente')}</Texte>
              </View>
            ) : null}
          </View>
          <Bouton
            titre={t('fa.payer')}
            icone="credit-card"
            onPress={() => router.push('/paiement')}
            desactive={aPayer.length === 0}
            style={{ marginTop: 15, height: 52 }}
          />
          <Texte doux taille={11.5} style={{ marginTop: 11, textAlign: 'center' }}>{t('fa.moyens')}</Texte>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 18, marginTop: 18 }}>
          {[['a_payer', t('fa.a_payer')], ['payee', t('fa.payees')]].map(([id, nom]) => {
            const actif = onglet === id;
            return (
              <Pressable
                key={id}
                onPress={() => setOnglet(id)}
                accessibilityRole="button"
                style={[
                  styles.onglet,
                  actif ? { backgroundColor: couleurs.nuit } : { backgroundColor: couleurs.carte, borderWidth: 1, borderColor: couleurs.bord },
                ]}
              >
                <Texte gras taille={12.5} style={{ color: actif ? '#ffffff' : couleurs.texteDoux }}>{nom}</Texte>
              </Pressable>
            );
          })}
        </View>

        {liste.length === 0 ? (
          <Vide icone="file-text" titre={t('fa.vide')} />
        ) : (
          <View style={{ gap: 11, marginHorizontal: 18, marginTop: 13 }}>
            {liste.map((f) => (
              <Pressable
                key={f.id}
                onPress={() => (f.statut === 'a_payer' ? router.push({ pathname: '/paiement', params: { facture: f.id } }) : null)}
                accessibilityRole="button"
                style={[styles.carte, ombres.carte]}
              >
                <View style={[styles.rond, { backgroundColor: f.statut === 'payee' ? 'rgba(14,159,110,0.13)' : couleurs.accentDoux }]}>
                  <Feather name={f.statut === 'payee' ? 'check' : 'file-text'} size={19} color={f.statut === 'payee' ? couleurs.vert : couleurs.accent} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Mono taille={13}>{f.numero}</Mono>
                  <Texte doux taille={12.5}>
                    {dateCourte(f.cree_le, langue)}
                    {f.facture_lignes?.length ? ` · ${f.facture_lignes.length} ${t('fa.colis')}` : ''}
                  </Texte>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Titre taille={16}>{montant(f.montant_usd, langue)}</Titre>
                  <Texte gras taille={11} style={{ color: f.statut === 'payee' ? couleurs.vert : '#c4500b' }}>
                    {f.statut === 'payee' ? t('fa.payee') : t('fa.a_payer')}
                  </Texte>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  entete: { backgroundColor: couleurs.nuit, paddingHorizontal: 20, paddingBottom: 52, overflow: 'hidden' },
  halo: { position: 'absolute', top: -70, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(244,96,13,0.18)' },
  carteSolde: {
    marginHorizontal: 18,
    marginTop: -40,
    backgroundColor: couleurs.carte,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: couleurs.bord,
    padding: 18,
  },
  pucePaiement: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: rayons.pastille, backgroundColor: couleurs.accentDoux },
  onglet: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: rayons.pastille },
  carte: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: couleurs.carte,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: couleurs.bord,
    padding: 15,
  },
  rond: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
