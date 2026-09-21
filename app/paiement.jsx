// Payer une facture : lien PayPal préparé par Goship Express, autres moyens à copier,
// puis envoi du reçu sur WhatsApp.

import { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, Pressable, Linking, Alert, StyleSheet } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Feather } from '@expo/vector-icons';
import config from '../config';
import EnTete from '../components/EnTete';
import { couleurs, rayons, ombres } from '../lib/theme';
import { Titre, Texte, Mono, Etiquette, Bouton, Chargement } from '../components/ui';
import { useLangue } from '../lib/i18n';
import { mesFactures } from '../lib/api';
import { montant as formatMontant } from '../lib/format';

function aCompleter(valeur) {
  return !valeur || /^\[.*\]$/.test(String(valeur).trim());
}

// Lien de paiement par carte : celui préparé pour la facture, sinon le lien de
// l'encaisseur (Azul), sinon un lien PayPal fabriqué avec le montant.
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

  const { t, langue } = useLangue();
  const { facture: idFacture } = useLocalSearchParams();
  const marges = useSafeAreaInsets();

  const [factures, setFactures] = useState(null);
  const [copie, setCopie] = useState('');

  const charger = useCallback(async () => {
    try {
      setFactures(await mesFactures());
    } catch (e) {
      setFactures([]);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const aPayer = (factures || []).filter((f) => f.statut === 'a_payer');
  const facture = idFacture ? (factures || []).find((f) => f.id === String(idFacture)) : null;
  const somme = facture ? Number(facture.montant_usd || 0) : aPayer.reduce((total, f) => total + Number(f.montant_usd || 0), 0);
  const lien = lienDePaiement(facture, somme);

  function payer() {
    if (aCompleter(lien)) {
      Alert.alert('GoShip Express', t('pay.indisponible'));
      return;
    }
    Linking.openURL(lien);
  }

  async function copier(id, valeur) {
    if (aCompleter(valeur)) return;
    await Clipboard.setStringAsync(String(valeur));
    setCopie(id);
    setTimeout(() => setCopie(''), 1800);
  }

  function envoyerRecu() {
    const texte = t('pay.message', {
      numero: facture ? facture.numero : (aPayer[0]?.numero || ''),
      montant: formatMontant(somme, langue),
    });
    Linking.openURL(`https://wa.me/${config.whatsapp}?text=${encodeURIComponent(texte)}`);
  }

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <EnTete titre={t('pay.titre')} retour arrondi={false} bas={18} />

      {factures === null ? (
        <Chargement />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: marges.bottom + 30, gap: 14 }}>
          <View style={[styles.carte, ombres.carte]}>
            <Etiquette>{t('pay.a_payer')}</Etiquette>
            <Titre taille={34} style={{ marginTop: 6 }}>{formatMontant(somme, langue)}</Titre>
            {facture ? <Mono taille={12.5} couleur={couleurs.texteDoux} style={{ marginTop: 6 }}>{facture.numero}</Mono> : null}
            <Bouton
              titre={t('pay.paypal')}
              icone="credit-card"
              onPress={payer}
              style={{ marginTop: 15, height: 52 }}
            />
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
                  accessibilityLabel={m.nom}
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
