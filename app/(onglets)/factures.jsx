// Factures, paiements et solde.
//
// Tout montant vient de la base : le total arrêté à la création (montant_usd), le payé,
// le solde et l'état de chaque facture (mes_factures), le solde de tout le compte
// (mon_resume). L'application n'additionne rien et ne décide pas si une facture est
// payée : c'est l'équipe qui enregistre un paiement, et la base qui en tire l'état.

import { useCallback, useEffect, useRef, useState } from 'react';
import { View, ScrollView, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import config from '../../config';
import { couleurs, rayons, ombres, COULEURS_ETAT } from '../../lib/theme';
import { Titre, Texte, Mono, Etiquette, Bouton, Vide, Chargement, EtatErreur, Bandeau } from '../../components/ui';
import { useLangue } from '../../lib/i18n';
import { useSession } from '../../lib/session';
import { useDonnees } from '../../lib/useDonnees';
import { mesFactures, monResume, factureOuverte, surveiller } from '../../lib/api';
import { dateCourte, montant } from '../../lib/format';

export default function Factures() {
  if (!config.modules.factures) return <Redirect href="/(onglets)" />;
  return <ListeFactures />;
}

function ListeFactures() {
  const { t, langue } = useLangue();
  const { profil } = useSession();
  const marges = useSafeAreaInsets();
  const [onglet, setOnglet] = useState('a_payer');
  const premier = useRef(true);

  const { donnees, erreur, recharger, rafraichit, tirer, chargement } = useDonnees(async () => {
    const [factures, resume] = await Promise.all([mesFactures(), monResume()]);
    return { factures, totaux: resume && resume.factures };
  }, []);

  useFocusEffect(useCallback(() => {
    if (premier.current) { premier.current = false; return; }
    recharger();
  }, [recharger]));
  useEffect(() => surveiller(profil?.id, recharger), [profil?.id, recharger]);

  const factures = donnees ? donnees.factures : [];
  const totaux = donnees ? donnees.totaux : null;
  const groupes = {
    a_payer: factures.filter(factureOuverte),
    payee: factures.filter((f) => f.statut !== 'annulee' && !factureOuverte(f)),
    annulee: factures.filter((f) => f.statut === 'annulee'),
  };
  const liste = groupes[onglet] || [];
  const solde = totaux ? Number(totaux.solde_usd) : 0;
  const ONGLETS = [['a_payer', t('fa.a_payer')], ['payee', t('fa.payees')]]
    .concat(groupes.annulee.length ? [['annulee', t('fa.annulees')]] : []);

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <View style={[styles.entete, { paddingTop: marges.top + 16 }]}>
        <View style={styles.halo} pointerEvents="none" />
        <Titre taille={23} couleur="#ffffff">{t('fa.titre')}</Titre>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={rafraichit} onRefresh={tirer} tintColor={couleurs.accent} />}
      >
        <View style={[styles.carteSolde, ombres.carte]}>
          <Etiquette>{t('fa.solde')}</Etiquette>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 6 }}>
            <Titre taille={34} testID="factures-solde">{totaux ? montant(totaux.solde_usd, langue) : '—'}</Titre>
            {groupes.a_payer.length > 0 ? (
              <View style={styles.pucePaiement}>
                <Texte gras taille={11.5} style={{ color: '#c4500b' }}>{groupes.a_payer.length} {t('fa.en_attente')}</Texte>
              </View>
            ) : null}
          </View>
          {totaux && Number(totaux.montant_en_retard) > 0 ? (
            <Texte gras taille={12.5} style={{ color: '#b91c1c', marginTop: 4 }}>
              {t('ac.en_retard', { montant: montant(totaux.montant_en_retard, langue) })}
            </Texte>
          ) : null}
          <Bouton
            titre={t('fa.payer')}
            icone="credit-card"
            onPress={() => router.push('/paiement')}
            desactive={!(solde > 0)}
            style={{ marginTop: 15, minHeight: 52 }}
            testID="factures-payer"
          />
          <Texte doux taille={11.5} style={{ marginTop: 11, textAlign: 'center' }}>{t('fa.moyens')}</Texte>
        </View>

        {donnees ? <Bandeau erreur={erreur} onReessayer={recharger} /> : null}

        <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 18, marginTop: 18 }}>
          {ONGLETS.map(([id, nom]) => {
            const actif = onglet === id;
            return (
              <Pressable
                key={id}
                onPress={() => setOnglet(id)}
                accessibilityRole="button"
                accessibilityState={{ selected: actif }}
                style={[
                  styles.onglet,
                  actif ? { backgroundColor: couleurs.nuit } : { backgroundColor: couleurs.carte, borderWidth: 1, borderColor: couleurs.bord },
                ]}
                testID={'factures-onglet-' + id}
              >
                <Texte gras taille={12.5} style={{ color: actif ? '#ffffff' : couleurs.texteDoux }}>{nom}</Texte>
              </Pressable>
            );
          })}
        </View>

        {chargement ? (
          <Chargement />
        ) : !donnees ? (
          <EtatErreur erreur={erreur} onReessayer={recharger} />
        ) : liste.length === 0 ? (
          <Vide icone="file-text" titre={t('fa.vide')} />
        ) : (
          <View style={{ gap: 11, marginHorizontal: 18, marginTop: 13 }}>
            {liste.map((f) => <CarteFacture key={f.id} facture={f} />)}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function CarteFacture({ facture: f }) {
  const { t, langue } = useLangue();
  const etat = f.statut === 'annulee' ? 'annulee' : (f.etat || f.statut);
  const c = COULEURS_ETAT[etat] || COULEURS_ETAT.a_payer;
  const ouverte = factureOuverte(f);
  return (
    <Pressable
      onPress={() => router.push('/facture/' + f.id)}
      accessibilityRole="button"
      accessibilityLabel={[f.numero, t('fa.etat.' + etat), montant(f.montant_usd, langue)].join(', ')}
      style={[styles.carte, ombres.carte]}
      testID={'facture-' + f.numero}
    >
      <View style={[styles.rond, { backgroundColor: c.fond }]}>
        <Feather name={c.icone} size={19} color={c.texte} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Mono taille={13}>{f.numero}</Mono>
        <Texte doux taille={12.5}>
          {dateCourte(f.cree_le, langue)}
          {f.lignes?.length ? ` · ${f.lignes.length} ${t('fa.colis')}` : ''}
        </Texte>
        {ouverte && Number(f.paye_usd) > 0 ? (
          <Texte doux taille={12}>{t('fa.paye')} {montant(f.paye_usd, langue)} · {t('fa.reste')} {montant(f.solde_usd, langue)}</Texte>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Titre taille={16} testID={'facture-' + f.numero + '-montant'}>
          {montant(ouverte ? f.solde_usd : f.montant_usd, langue)}
        </Titre>
        <Texte gras taille={11} style={{ color: c.texte }}>{t('fa.etat.' + etat)}</Texte>
      </View>
    </Pressable>
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
  onglet: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: rayons.pastille, minHeight: 40, justifyContent: 'center' },
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
