// Une facture : ses lignes, ses paiements reçus, son total, son payé et son solde —
// exactement les valeurs de la base (mes_factures). Payer ouvre l'écran de paiement ;
// c'est l'équipe qui enregistre le paiement reçu, jamais l'application.

import { View, ScrollView, StyleSheet } from 'react-native';
import { Redirect, useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import config from '../../config';
import EnTete from '../../components/EnTete';
import { couleurs, rayons, ombres, COULEURS_ETAT } from '../../lib/theme';
import { Titre, Texte, Mono, Etiquette, Bouton, Chargement, EtatErreur } from '../../components/ui';
import { useLangue } from '../../lib/i18n';
import { useDonnees } from '../../lib/useDonnees';
import { mesFactures, factureOuverte } from '../../lib/api';
import { dateCourte, montant, poids } from '../../lib/format';

export default function DetailFacture() {
  if (!config.modules.factures) return <Redirect href="/(onglets)" />;
  return <Detail />;
}

function Detail() {
  const { id } = useLocalSearchParams();
  const { t, langue } = useLangue();
  const marges = useSafeAreaInsets();

  const { donnees: f, erreur, recharger, chargement } = useDonnees(async () => {
    // mes_factures ne rend que les factures du compte connecté
    const trouvee = (await mesFactures()).find((x) => x.id === String(id));
    if (!trouvee) {
      const e = new Error('introuvable');
      e.goship = { type: 'introuvable', code: 'INTROUVABLE', detail: '' };
      throw e;
    }
    return trouvee;
  }, [id]);

  const etat = f ? (f.statut === 'annulee' ? 'annulee' : (f.etat || f.statut)) : 'a_payer';
  const c = COULEURS_ETAT[etat] || COULEURS_ETAT.a_payer;

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <EnTete titre={f ? f.numero : t('fa.detail_titre')} retour arrondi={false} bas={18} />
      {chargement ? (
        <Chargement />
      ) : !f ? (
        <EtatErreur erreur={erreur} onReessayer={recharger} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 18, gap: 14, paddingBottom: marges.bottom + 30 }}>
          <View style={[styles.carte, ombres.carte]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Mono taille={13.5}>{f.numero}</Mono>
              <View style={[styles.puce, { backgroundColor: c.fond }]}>
                <Texte gras taille={11.5} style={{ color: c.texte }} testID="facture-etat">{t('fa.etat.' + etat)}</Texte>
              </View>
            </View>
            <Texte doux taille={12.5} style={{ marginTop: 6 }}>
              {dateCourte(f.cree_le, langue)}
              {f.echeance_le ? ` · ${t('fa.echeance')} ${dateCourte(f.echeance_le, langue)}` : ''}
            </Texte>
            <Ligne titre={t('fa.total')} valeur={montant(f.montant_usd, langue)} id="facture-total" fort />
            <Ligne titre={t('fa.paye')} valeur={montant(f.paye_usd, langue)} id="facture-paye" />
            <Ligne titre={t('fa.reste')} valeur={montant(f.solde_usd, langue)} id="facture-solde" fort />
            {factureOuverte(f) ? (
              <Bouton titre={t('fa.payer')} icone="credit-card" style={{ marginTop: 14 }}
                onPress={() => router.push({ pathname: '/paiement', params: { facture: f.id } })} testID="facture-payer" />
            ) : null}
          </View>

          <View style={[styles.carte, ombres.carte]}>
            <Titre taille={15.5} style={{ marginBottom: 6 }}>{t('fa.lignes')}</Titre>
            {(f.lignes || []).map((l, i) => (
              <View key={i} style={styles.ligne}>
                <View style={{ flex: 1 }}>
                  <Texte taille={13.5}>{l.libelle || l.colis || '—'}</Texte>
                  {l.colis || l.poids_lb ? (
                    <Texte doux taille={12}>{[l.colis, l.poids_lb ? poids(l.poids_lb, langue) : ''].filter(Boolean).join(' · ')}</Texte>
                  ) : null}
                </View>
                <Texte gras taille={13.5}>{montant(l.montant_usd, langue)}</Texte>
              </View>
            ))}
            {Number(f.frais_service_usd) > 0 ? (
              <View style={styles.ligne}>
                <Texte taille={13.5} style={{ flex: 1 }}>{t('fa.frais')}</Texte>
                <Texte gras taille={13.5}>{montant(f.frais_service_usd, langue)}</Texte>
              </View>
            ) : null}
          </View>

          <View style={[styles.carte, ombres.carte]} testID="facture-paiements">
            <Titre taille={15.5} style={{ marginBottom: 6 }}>{t('fa.paiements')}</Titre>
            {(f.paiements || []).length === 0 ? (
              <Texte doux taille={13}>{t('fa.aucun_paiement')}</Texte>
            ) : f.paiements.map((p, i) => (
              <View key={i} style={styles.ligne} testID="facture-paiement">
                <View style={{ flex: 1 }}>
                  <Texte taille={13.5}>{t('moyen.' + p.moyen)}</Texte>
                  <Texte doux taille={12}>{dateCourte(p.paye_le, langue)}</Texte>
                </View>
                <Texte gras taille={13.5}>{montant(p.montant_usd, langue)}</Texte>
              </View>
            ))}
          </View>
          {f.note ? <Texte doux taille={12.5} style={{ lineHeight: 19 }}>{f.note}</Texte> : null}
        </ScrollView>
      )}
    </View>
  );
}

function Ligne({ titre, valeur, fort, id }) {
  return (
    <View style={[styles.ligne, { marginTop: 4 }]}>
      <Etiquette style={{ flex: 1 }}>{titre}</Etiquette>
      {fort ? <Titre taille={17} testID={id}>{valeur}</Titre> : <Texte gras taille={14} testID={id}>{valeur}</Texte>}
    </View>
  );
}

const styles = StyleSheet.create({
  carte: { backgroundColor: couleurs.carte, borderRadius: rayons.carte, borderWidth: 1, borderColor: couleurs.bord, padding: 17 },
  puce: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: rayons.pastille },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#f1f4fa' },
});
