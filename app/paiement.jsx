// Payer une facture : lien de paiement par carte, autres moyens à copier, puis envoi du
// reçu sur WhatsApp.
//
// Le montant proposé est le SOLDE calculé par la base (ce qui reste dû, paiements déjà
// reçus déduits) : celui d'une facture, ou celui de tout le compte (mon_resume).
// L'application n'enregistre aucun paiement et ne marque rien « payé » : l'équipe
// enregistre le paiement reçu (enregistrer_paiement), et la base met à jour le solde.

import { useState } from 'react';
import { View, ScrollView, Pressable, Linking, StyleSheet } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Feather } from '@expo/vector-icons';
import config, { aCompleter } from '../config';
import EnTete from '../components/EnTete';
import { couleurs, rayons, ombres } from '../lib/theme';
import { Titre, Texte, Mono, Etiquette, Bouton, Chargement, EtatErreur } from '../components/ui';
import { useLangue } from '../lib/i18n';
import { useDonnees } from '../lib/useDonnees';
import { mesFactures, monResume, factureOuverte } from '../lib/api';
import { montant as formatMontant } from '../lib/format';

// Lien de paiement par carte : celui préparé pour la facture, sinon le lien de
// l'encaisseur (Azul), sinon un lien PayPal fabriqué avec le montant dû.
function lienDePaiement(facture, somme) {
  if (facture && facture.lien_paiement) return facture.lien_paiement;
  if (!aCompleter(config.paiement.carteLien)) return config.paiement.carteLien;
  const email = config.paiement.carteEmail;
  if (aCompleter(email) || !(somme > 0)) return '';
  const intitule = 'Goship Express' + (facture ? ' — facture ' + facture.numero : '');
  return 'https://www.paypal.com/cgi-bin/webscr?cmd=_xclick'
    + '&business=' + encodeURIComponent(email)
    + '&currency_code=' + encodeURIComponent(config.paiement.carteDevise || 'USD')
    + '&amount=' + Number(somme).toFixed(2)
    + '&item_name=' + encodeURIComponent(intitule)
    + '&no_shipping=1&no_note=1';
}

export default function Paiement() {
  if (!config.modules.factures) return <Redirect href="/(onglets)" />;
  return <EcranPaiement />;
}

function EcranPaiement() {
  const { t, langue } = useLangue();
  const { facture: idFacture } = useLocalSearchParams();
  const marges = useSafeAreaInsets();
  const [copie, setCopie] = useState('');
  const [avis, setAvis] = useState('');

  const { donnees, erreur, recharger, chargement } = useDonnees(async () => {
    const [factures, resume] = await Promise.all([mesFactures(), monResume()]);
    return { factures, totaux: resume && resume.factures };
  }, []);

  const factures = donnees ? donnees.factures : [];
  const ouvertes = factures.filter(factureOuverte);
  const facture = idFacture ? factures.find((f) => f.id === String(idFacture)) : null;
  const somme = facture ? Number(facture.solde_usd || 0) : Number((donnees && donnees.totaux && donnees.totaux.solde_usd) || 0);
  const lien = lienDePaiement(facture, somme);

  function payer() {
    if (aCompleter(lien)) { setAvis(t('pay.indisponible')); return; }
    Linking.openURL(lien).catch(() => setAvis(t('pay.indisponible')));
  }

  async function copier(id, valeur) {
    if (aCompleter(valeur)) return;
    await Clipboard.setStringAsync(String(valeur));
    setCopie(id);
    setTimeout(() => setCopie(''), 1800);
  }

  function envoyerRecu() {
    const texte = t('pay.message', {
      numero: facture ? facture.numero : ouvertes.map((f) => f.numero).join(', '),
      montant: formatMontant(somme, langue),
    });
    Linking.openURL(`https://wa.me/${config.whatsapp}?text=${encodeURIComponent(texte)}`).catch(() => {});
  }

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <EnTete titre={t('pay.titre')} retour arrondi={false} bas={18} />

      {chargement ? (
        <Chargement />
      ) : !donnees ? (
        <EtatErreur erreur={erreur} onReessayer={recharger} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: marges.bottom + 30, gap: 14 }}>
          <View style={[styles.carte, ombres.carte]}>
            <Etiquette>{t('pay.a_payer')}</Etiquette>
            <Titre taille={34} style={{ marginTop: 6 }} testID="paiement-montant">{formatMontant(somme, langue)}</Titre>
            {facture ? <Mono taille={12.5} couleur={couleurs.texteDoux} style={{ marginTop: 6 }}>{facture.numero}</Mono> : null}
            <Bouton
              titre={t('pay.paypal')}
              icone="credit-card"
              onPress={payer}
              desactive={!(somme > 0)}
              style={{ marginTop: 15, minHeight: 52 }}
            />
            {avis ? <Texte taille={12.5} style={{ marginTop: 10, color: couleurs.rouge, textAlign: 'center' }}>{avis}</Texte> : null}
            <Texte doux taille={11.5} style={{ marginTop: 10, textAlign: 'center', lineHeight: 17 }}>
              {t(config.paiement.fournisseur === 'azul' ? 'pay.carte_note' : 'pay.paypal_note')}
            </Texte>
          </View>

          <View style={{ gap: 10 }}>
            <Titre taille={16}>{t('pay.autres')}</Titre>
            {config.paiement.moyens.map((m) => {
              const vide = aCompleter(m.valeur);
              return (
                <Pressable
                  key={m.id}
                  onPress={() => copier(m.id, m.valeur)}
                  accessibilityRole="button"
                  accessibilityLabel={m.nom + (vide ? ', ' + t('pay.a_completer') : ', ' + t('gen.copier'))}
                  accessibilityState={{ disabled: vide }}
                  style={({ pressed }) => [styles.moyen, ombres.carte, pressed && !vide && { opacity: 0.9 }]}
                >
                  <View style={styles.rond}>
                    <Feather name={m.icone} size={18} color={couleurs.texte} />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Texte gras taille={14.5}>{m.nom}</Texte>
                    <Texte doux taille={12.5} numberOfLines={2}>
                      {vide ? t('pay.a_completer') : m.valeur}
                    </Texte>
                  </View>
                  {!vide ? (
                    <Feather name={copie === m.id ? 'check' : 'copy'} size={18} color={copie === m.id ? couleurs.vert : couleurs.texteFaible} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <Bouton titre={t('pay.recu')} icone="message-circle" variante="sombre" onPress={envoyerRecu} />
          <Texte doux taille={12.5} style={{ textAlign: 'center', lineHeight: 19 }}>{t('pay.apres')}</Texte>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  carte: {
    backgroundColor: couleurs.carte,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: couleurs.bord,
    padding: 18,
  },
  moyen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: couleurs.carte,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: couleurs.bord,
    padding: 14,
  },
  rond: {
    width: 40,
    height: 40,
    borderRadius: rayons.champ,
    backgroundColor: '#f3f6fc',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
