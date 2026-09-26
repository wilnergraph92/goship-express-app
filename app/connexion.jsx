// Écran de connexion (mêmes comptes que le site).

import { useState } from 'react';
import { View, Image, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Link, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { couleurs, rayons } from '../lib/theme';
import { Titre, Texte, Bouton, Champ } from '../components/ui';
import { useLangue } from '../lib/i18n';
import { useSession } from '../lib/session';
import { classer } from '../lib/erreurs';

// Ce que l'écran dit d'un refus de connexion
function raison(e, t) {
  const code = String((e && (e.code || e.error_code)) || '');
  if (code === 'email_not_confirmed') return t('cx.non_confirme');
  const c = classer(e);
  if (c.type === 'reseau' || c.type === 'delai' || c.type === 'serveur') return t('err.' + c.type);
  return t('cx.echec');
}

export default function Connexion() {
  const { t } = useLangue();
  const { connexion, motDePasseOublie, sessionExpiree } = useSession();
  const marges = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [visible, setVisible] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState(null); // { type, texte }

  async function entrer() {
    if (occupe) return;
    if (!email.trim() || !motDePasse) { setMessage({ type: 'erreur', texte: t('cx.remplir') }); return; }
    setOccupe(true);
    setMessage(null);
    try {
      await connexion(email, motDePasse);
      router.replace('/(onglets)');
    } catch (e) {
      setMessage({ type: 'erreur', texte: raison(e, t) });
    } finally {
      setOccupe(false);
    }
  }

  async function oubli() {
    if (!email.trim()) { setMessage({ type: 'erreur', texte: t('cx.email') + ' ?' }); return; }
    try {
      await motDePasseOublie(email);
    } catch (e) {
      const c = classer(e);
      if (c.type === 'reseau' || c.type === 'delai') { setMessage({ type: 'erreur', texte: t('err.' + c.type) }); return; }
      // Sinon, réponse volontairement identique, qu'il existe un compte ou non
    }
    setMessage({ type: 'ok', texte: t('cx.mail_envoye') });
  }

  const avis = message || (sessionExpiree ? { type: 'info', texte: t('cx.session_expiree') } : null);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: couleurs.nuit }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={{ paddingTop: marges.top + 26, paddingHorizontal: 26, paddingBottom: 24 }}>
          <View style={{ position: 'absolute', top: -110, right: -80, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(244,96,13,0.22)' }} />
          <Image
            source={require('../assets/logo-goship-blanc.png')}
            style={{ width: 150, height: 38 }}
            resizeMode="contain"
            accessibilityLabel="GoShip Express"
          />
          <Titre taille={32} couleur="#ffffff" style={{ marginTop: 22 }}>{t('cx.titre')}</Titre>
          <Texte taille={14.5} style={{ marginTop: 10, color: couleurs.surNuit, lineHeight: 21 }}>{t('cx.sous_titre')}</Texte>
        </View>

        <View style={{ flex: 1, backgroundColor: couleurs.carte, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: marges.bottom + 20, gap: 16 }}>
          {avis ? (
            <View
              accessibilityLiveRegion="polite"
              testID={'connexion-' + avis.type}
              style={{
                flexDirection: 'row', gap: 10, alignItems: 'center', padding: 13, borderRadius: 14,
                backgroundColor: avis.type === 'ok' ? 'rgba(14,159,110,0.08)' : avis.type === 'info' ? '#fff4e0' : 'rgba(192,57,43,0.07)',
              }}
            >
              <Feather name={avis.type === 'ok' ? 'check-circle' : avis.type === 'info' ? 'clock' : 'alert-circle'} size={18}
                color={avis.type === 'ok' ? couleurs.vert : avis.type === 'info' ? '#8a4b00' : couleurs.rouge} />
              <Texte taille={13.5} style={{ flex: 1, lineHeight: 19 }}>{avis.texte}</Texte>
            </View>
          ) : null}

          <Champ
            etiquette={t('cx.email')}
            value={email}
            onChangeText={(v) => { setEmail(v); setMessage(null); }}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            inputMode="email"
            textContentType="username"
            placeholder="nom@exemple.com"
            testID="connexion-email"
          />

          <Champ
            etiquette={t('cx.motdepasse')}
            value={motDePasse}
            onChangeText={(v) => { setMotDePasse(v); setMessage(null); }}
            secureTextEntry={!visible}
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            placeholder="••••••••"
            onSubmitEditing={entrer}
            testID="connexion-mdp"
            apres={
              <Pressable
                onPress={() => setVisible((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={visible ? t('cx.cacher_mdp') : t('cx.voir_mdp')}
                style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <Feather name={visible ? 'eye-off' : 'eye'} size={20} color={couleurs.texteDoux} />
              </Pressable>
            }
          />

          <Pressable onPress={oubli} style={{ alignSelf: 'flex-end', paddingVertical: 6 }} accessibilityRole="button" testID="connexion-oubli">
            <Texte gras taille={13.5} doux>{t('cx.oublie')}</Texte>
          </Pressable>

          <Bouton titre={t('cx.connexion')} onPress={entrer} occupe={occupe} icone="arrow-right" testID="connexion-entrer" />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: couleurs.bord }} />
            <Texte doux taille={12}>{t('gen.ou')}</Texte>
            <View style={{ flex: 1, height: 1, backgroundColor: couleurs.bord }} />
          </View>

          <Link href="/inscription" asChild>
            <Pressable
              style={{ minHeight: 54, borderRadius: rayons.bouton, borderWidth: 1.5, borderColor: couleurs.bordFort, alignItems: 'center', justifyContent: 'center' }}
              accessibilityRole="button"
              testID="connexion-creer"
            >
              <Texte gras taille={15}>{t('cx.creer')}</Texte>
            </Pressable>
          </Link>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
