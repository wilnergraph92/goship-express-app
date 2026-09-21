// Création d'un compte client (le code GSE est attribué automatiquement par la base).

import { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import EnTete from '../components/EnTete';
import { Texte, Bouton, Champ, Etiquette } from '../components/ui';
import { couleurs, rayons } from '../lib/theme';
import { useLangue } from '../lib/i18n';
import { useSession } from '../lib/session';

const PAYS = [
  { code: 'HT', cle: 'pays.HT' },
  { code: 'DO', cle: 'pays.DO' },
  { code: 'US', cle: 'pays.US' },
];

export default function Inscription() {
  const { t, langue } = useLangue();
  const { inscription } = useSession();

  const [champs, setChamps] = useState({
    nom_complet: '', email: '', motDePasse: '', telephone: '', pays: 'HT', ville: '',
  });
  const [occupe, setOccupe] = useState(false);

  const poser = (cle) => (valeur) => setChamps((c) => ({ ...c, [cle]: valeur }));

  async function creer() {
    if (!champs.nom_complet.trim() || !champs.email.trim() || !champs.motDePasse) {
      Alert.alert('GoShip Express', t('in.champs'));
      return;
    }
    setOccupe(true);
    try {
      const res = await inscription({ ...champs, langue });
      if (res && res.confirmation) {
        // Compte créé, mais l'adresse e-mail doit d'abord être confirmée
        Alert.alert('GoShip Express', t('in.confirmez'), [
          { text: 'OK', onPress: () => router.replace('/connexion') },
        ]);
        return;
      }
      router.replace('/(onglets)');
    } catch (e) {
      const messages = { 'email-existe': t('cx.echec'), 'mot-de-passe-court': t('in.mdp_court') };
      const message = (e && messages[e.code]) || (e && e.message) || t('gen.erreur');
      Alert.alert('GoShip Express', message);
    } finally {
      setOccupe(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <EnTete titre={t('in.titre')} retour>
        <Texte taille={12.5} style={{ marginTop: 12, color: couleurs.surNuit, lineHeight: 19 }}>{t('in.sous_titre')}</Texte>
      </EnTete>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40, gap: 14 }} keyboardShouldPersistTaps="handled">
        <Champ etiquette={t('in.nom')} value={champs.nom_complet} onChangeText={poser('nom_complet')} autoComplete="name" />
        <Champ etiquette={t('cx.email')} value={champs.email} onChangeText={poser('email')} autoCapitalize="none" keyboardType="email-address" inputMode="email" autoComplete="email" />
        <Champ etiquette={t('cx.motdepasse')} value={champs.motDePasse} onChangeText={poser('motDePasse')} secureTextEntry autoCapitalize="none" autoComplete="new-password" />
        <Champ etiquette={t('in.telephone')} value={champs.telephone} onChangeText={poser('telephone')} keyboardType="phone-pad" autoComplete="tel" />

        <View style={{ gap: 7 }}>
          <Etiquette>{t('in.pays')}</Etiquette>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {PAYS.map((p) => (
              <Pressable
                key={p.code}
                onPress={() => poser('pays')(p.code)}
                accessibilityRole="button"
                style={{
                  flex: 1,
                  height: 50,
                  borderRadius: rayons.champ,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: champs.pays === p.code ? couleurs.nuit : couleurs.carte,
                  borderWidth: 1,
                  borderColor: champs.pays === p.code ? couleurs.nuit : couleurs.bord,
                }}
              >
                <Texte gras taille={13} style={{ color: champs.pays === p.code ? '#ffffff' : couleurs.texte }} numberOfLines={1}>
                  {t(p.cle)}
                </Texte>
              </Pressable>
            ))}
          </View>
        </View>

        <Champ etiquette={t('in.ville')} value={champs.ville} onChangeText={poser('ville')} />

        <Bouton titre={t('in.creer')} onPress={creer} occupe={occupe} style={{ marginTop: 6 }} />

        <Pressable onPress={() => router.replace('/connexion')} style={{ alignItems: 'center', paddingVertical: 10 }} accessibilityRole="button">
          <Texte gras doux taille={14}>{t('in.deja')}</Texte>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
