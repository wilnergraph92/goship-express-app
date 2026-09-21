// Écran de connexion.

import { useState } from 'react';
import { View, Image, ScrollView, KeyboardAvoidingView, Platform, Pressable, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { couleurs, rayons } from '../lib/theme';
import { Titre, Texte, Bouton, Champ } from '../components/ui';
import { useLangue } from '../lib/i18n';
import { useSession } from '../lib/session';

export default function Connexion() {
  const { t } = useLangue();
  const { connexion, motDePasseOublie } = useSession();
  const marges = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [visible, setVisible] = useState(false);
  const [occupe, setOccupe] = useState(false);

  async function entrer() {
    if (!email.trim() || !motDePasse) return;
    setOccupe(true);
    try {
      await connexion(email, motDePasse);
      router.replace('/(onglets)');
    } catch (e) {
      Alert.alert('GoShip Express', t('cx.echec'));
    } finally {
      setOccupe(false);
    }
  }

  async function oubli() {
    if (!email.trim()) {
      Alert.alert('GoShip Express', t('cx.email'));
      return;
    }
    try {
      await motDePasseOublie(email);
    } catch (e) {
      // réponse volontairement identique, qu'il existe un compte ou non
    }
    Alert.alert('GoShip Express', t('cx.mail_envoye'));
  }

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
          <Champ
            etiquette={t('cx.email')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            inputMode="email"
            placeholder="nom@exemple.com"
          />

          <Champ
            etiquette={t('cx.motdepasse')}
            value={motDePasse}
            onChangeText={setMotDePasse}
            secureTextEntry={!visible}
            autoCapitalize="none"
            autoComplete="current-password"
            placeholder="••••••••"
            apres={
              <Pressable
                onPress={() => setVisible((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={t('cx.motdepasse')}
                style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <Feather name={visible ? 'eye-off' : 'eye'} size={20} color={couleurs.texteDoux} />
              </Pressable>
            }
          />

          <Pressable onPress={oubli} style={{ alignSelf: 'flex-end' }} accessibilityRole="button">
            <Texte gras taille={13.5} doux>{t('cx.oublie')}</Texte>
          </Pressable>

          <Bouton titre={t('cx.connexion')} onPress={entrer} occupe={occupe} icone="arrow-right" />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: couleurs.bord }} />
            <Texte doux taille={12}>ou</Texte>
            <View style={{ flex: 1, height: 1, backgroundColor: couleurs.bord }} />
          </View>

          <Link href="/inscription" asChild>
            <Pressable
              style={{ height: 54, borderRadius: rayons.bouton, borderWidth: 1.5, borderColor: couleurs.bordFort, alignItems: 'center', justifyContent: 'center' }}
              accessibilityRole="button"
            >
              <Texte gras taille={15}>{t('cx.creer')}</Texte>
            </Pressable>
          </Link>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
