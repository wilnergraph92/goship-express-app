// Création d'un compte client (le code GSE est attribué automatiquement par la base).

import { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import EnTete from '../components/EnTete';
import { Texte, Bouton, Champ, Etiquette } from '../components/ui';
import { couleurs, rayons } from '../lib/theme';
import { useLangue } from '../lib/i18n';
import { useSession, MDP_MINIMUM, emailValide } from '../lib/session';
import { classer } from '../lib/erreurs';

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
  const [erreurs, setErreurs] = useState({});
  const [message, setMessage] = useState(null);
  const [occupe, setOccupe] = useState(false);

  const poser = (cle) => (valeur) => {
    setChamps((c) => ({ ...c, [cle]: valeur }));
    setErreurs((e) => ({ ...e, [cle]: undefined }));
    setMessage(null);
  };

  async function creer() {
    if (occupe) return;
    const e = {};
    if (!champs.nom_complet.trim()) e.nom_complet = t('in.champs');
    if (!emailValide(champs.email)) e.email = t('in.email_invalide');
    if (String(champs.motDePasse).length < MDP_MINIMUM) e.motDePasse = t('in.mdp_court');
    if (Object.keys(e).length) { setErreurs(e); return; }
    setOccupe(true);
    try {
      const res = await inscription({ ...champs, langue });
      if (res && res.confirmation) {
        // Compte créé, mais l'adresse e-mail doit d'abord être confirmée
        setMessage({ type: 'ok', texte: t('in.confirmez') });
        return;
      }
      router.replace('/(onglets)');
    } catch (err) {
      const code = err && err.code;
      if (code === 'email-existe') setErreurs({ email: t('in.email_existe') });
      else if (code === 'email-invalide') setErreurs({ email: t('in.email_invalide') });
      else if (code === 'mot-de-passe-court' || code === 'weak_password') setErreurs({ motDePasse: t('in.mdp_court') });
      else {
        const c = classer(err);
        setMessage({ type: 'erreur', texte: t('err.' + (['reseau', 'delai', 'serveur'].indexOf(c.type) >= 0 ? c.type : 'inconnue')) });
      }
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
        <Champ etiquette={t('in.nom')} value={champs.nom_complet} onChangeText={poser('nom_complet')} autoComplete="name"
          erreur={erreurs.nom_complet} maxLength={120} testID="in-nom" />
        <Champ etiquette={t('cx.email')} value={champs.email} onChangeText={poser('email')} autoCapitalize="none"
          keyboardType="email-address" inputMode="email" autoComplete="email" erreur={erreurs.email} maxLength={160} testID="in-email" />
        <Champ etiquette={t('cx.motdepasse')} value={champs.motDePasse} onChangeText={poser('motDePasse')} secureTextEntry
          autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" erreur={erreurs.motDePasse} testID="in-mdp" />
        <Champ etiquette={t('in.telephone')} value={champs.telephone} onChangeText={poser('telephone')} keyboardType="phone-pad"
          autoComplete="tel" maxLength={40} testID="in-telephone" />

        <View style={{ gap: 7 }}>
          <Etiquette>{t('in.pays')}</Etiquette>
          <View style={{ flexDirection: 'row', gap: 8 }} accessibilityRole="radiogroup">
            {PAYS.map((p) => (
              <Pressable
                key={p.code}
                onPress={() => poser('pays')(p.code)}
                accessibilityRole="radio"
                accessibilityState={{ selected: champs.pays === p.code }}
                style={{
                  flex: 1,
                  minHeight: 50,
                  paddingHorizontal: 6,
                  paddingVertical: 6,
                  borderRadius: rayons.champ,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: champs.pays === p.code ? couleurs.nuit : couleurs.carte,
                  borderWidth: 1,
                  borderColor: champs.pays === p.code ? couleurs.nuit : couleurs.bord,
                }}
              >
                <Texte gras taille={13} style={{ color: champs.pays === p.code ? '#ffffff' : couleurs.texte, textAlign: 'center' }} numberOfLines={2}>
                  {t(p.cle)}
                </Texte>
              </Pressable>
            ))}
          </View>
        </View>

        <Champ etiquette={t('in.ville')} value={champs.ville} onChangeText={poser('ville')} maxLength={80} testID="in-ville" />

        {message ? (
          <View accessibilityLiveRegion="polite" testID={'in-' + message.type}
            style={{ flexDirection: 'row', gap: 10, alignItems: 'center', padding: 13, borderRadius: 14,
              backgroundColor: message.type === 'ok' ? 'rgba(14,159,110,0.08)' : 'rgba(192,57,43,0.07)' }}>
            <Feather name={message.type === 'ok' ? 'mail' : 'alert-circle'} size={18} color={message.type === 'ok' ? couleurs.vert : couleurs.rouge} />
            <Texte taille={13.5} style={{ flex: 1, lineHeight: 19 }}>{message.texte}</Texte>
          </View>
        ) : null}

        {message && message.type === 'ok' ? (
          <Bouton titre={t('cx.connexion')} onPress={() => router.replace('/connexion')} style={{ marginTop: 6 }} />
        ) : (
          <Bouton titre={t('in.creer')} onPress={creer} occupe={occupe} style={{ marginTop: 6 }} testID="in-creer" />
        )}

        <Pressable onPress={() => router.replace('/connexion')} style={{ alignItems: 'center', paddingVertical: 12 }} accessibilityRole="button">
          <Texte gras doux taille={14}>{t('in.deja')}</Texte>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
