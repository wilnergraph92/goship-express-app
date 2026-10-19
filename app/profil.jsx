// Mes informations : nom, téléphone, pays, ville, adresse. Surtout pour un compte ouvert
// avec Google, qui n'a ni pays, ni ville, ni téléphone ; l'accueil y mène tant qu'ils
// manquent. La base n'accepte que ces champs-là (droits de colonnes de « clients »).

import { useEffect, useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import EnTete from '../components/EnTete';
import { Texte, Bouton, Champ, ChampDate, Etiquette } from '../components/ui';
import { couleurs, rayons } from '../lib/theme';
import { useLangue } from '../lib/i18n';
import { useSession } from '../lib/session';
import { majProfil, maNaissance, definirNaissance } from '../lib/api';
import { classer, messageErreur } from '../lib/erreurs';
import { lireNaissance, jourCivil, MESSAGE_NAISSANCE } from '../lib/naissance';

const PAYS = [
  { code: 'HT', cle: 'pays.HT' },
  { code: 'DO', cle: 'pays.DO' },
  { code: 'US', cle: 'pays.US' },
];

export default function Profil() {
  const { t, langue } = useLangue();
  const { profil, rafraichirProfil } = useSession();

  const [champs, setChamps] = useState(() => ({
    nom_complet: profil?.nom_complet || '',
    telephone: profil?.telephone || '',
    pays: PAYS.some((p) => p.code === profil?.pays) ? profil.pays : 'HT',
    ville: profil?.ville || '',
    adresse: profil?.adresse || '',
  }));
  // La date de naissance : undefined = pas encore lue (ou base sans la fonction), null = jamais
  // déclarée, sinon « AAAA-MM-JJ ». Elle ne se déclare qu'une fois.
  const [declaree, setDeclaree] = useState(undefined);
  const [naissance, setNaissance] = useState({ jour: '', mois: '', annee: '' });
  const [erreurs, setErreurs] = useState({});
  const [message, setMessage] = useState('');
  const [occupe, setOccupe] = useState(false);

  useEffect(() => {
    let actif = true;
    maNaissance().then((v) => { if (actif) setDeclaree(v); }, () => {});
    return () => { actif = false; };
  }, []);

  const poser = (cle) => (valeur) => {
    setChamps((c) => ({ ...c, [cle]: valeur }));
    setErreurs((e) => ({ ...e, [cle]: undefined }));
    setMessage('');
  };

  async function enregistrer() {
    if (occupe || !profil?.id) return;
    const e = {};
    if (!champs.nom_complet.trim()) e.nom_complet = t('in.champs');
    if (!champs.telephone.trim()) e.telephone = t('in.champs');
    if (!champs.ville.trim()) e.ville = t('in.champs');
    // Facultative ici (le profil s'enregistre sans) ; si on la remplit, elle doit être juste
    const remplie = declaree === null && (naissance.jour || naissance.mois || naissance.annee);
    const n = remplie ? lireNaissance(naissance) : null;
    if (n && !n.valide) e.naissance = t(MESSAGE_NAISSANCE[n.code]);
    if (Object.keys(e).length) { setErreurs(e); return; }
    setOccupe(true);
    try {
      if (n) {
        try { await definirNaissance(n.iso); } catch (err) {
          setErreurs({ naissance: messageErreur(err, t) });
          return;
        }
      }
      await majProfil(profil.id, {
        nom_complet: champs.nom_complet.trim().replace(/\s+/g, ' '),
        telephone: champs.telephone.trim(),
        pays: champs.pays,
        ville: champs.ville.trim(),
        adresse: champs.adresse.trim(),
      });
      await rafraichirProfil();
      router.back();
    } catch (err) {
      const c = classer(err);
      setMessage(t('err.' + (['reseau', 'delai', 'serveur'].indexOf(c.type) >= 0 ? c.type : 'inconnue')));
    } finally {
      setOccupe(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <EnTete titre={t('pf.titre')} retour>
        <Texte taille={12.5} style={{ marginTop: 12, color: couleurs.surNuit, lineHeight: 19 }}>{t('pf.completer_texte')}</Texte>
      </EnTete>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40, gap: 14 }} keyboardShouldPersistTaps="handled">
        <Champ etiquette={t('in.nom')} value={champs.nom_complet} onChangeText={poser('nom_complet')} autoComplete="name"
          erreur={erreurs.nom_complet} maxLength={120} testID="pf-nom" />
        <Champ etiquette={t('in.telephone')} value={champs.telephone} onChangeText={poser('telephone')} keyboardType="phone-pad"
          autoComplete="tel" erreur={erreurs.telephone} maxLength={40} testID="pf-telephone" />

        <View style={{ gap: 7 }}>
          <Etiquette>{t('in.pays')}</Etiquette>
          <View style={{ flexDirection: 'row', gap: 8 }} accessibilityRole="radiogroup">
            {PAYS.map((p) => (
              <Pressable
                key={p.code}
                onPress={() => poser('pays')(p.code)}
                accessibilityRole="radio"
                accessibilityState={{ selected: champs.pays === p.code }}
                testID={'pf-pays-' + p.code}
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

        <Champ etiquette={t('in.ville')} value={champs.ville} onChangeText={poser('ville')} erreur={erreurs.ville}
          maxLength={80} testID="pf-ville" />
        <Champ etiquette={t('pf.adresse')} value={champs.adresse} onChangeText={poser('adresse')} maxLength={200}
          autoComplete="street-address" testID="pf-adresse" />

        {declaree === null ? (
          <ChampDate etiquette={t('nz.libelle')} aide={t('nz.carte_texte')} valeur={naissance} erreur={erreurs.naissance} testID="pf-naissance"
            onChange={(v) => { setNaissance(v); setErreurs((x) => ({ ...x, naissance: undefined })); setMessage(''); }} />
        ) : typeof declaree === 'string' ? (
          <View style={{ gap: 6 }} testID="pf-naissance-lue">
            <Etiquette>{t('nz.libelle')}</Etiquette>
            <Texte gras taille={15}>{jourCivil(declaree, langue)}</Texte>
            <Texte doux taille={12}>{t('nz.fixe')}</Texte>
          </View>
        ) : null}

        {message ? (
          <View accessibilityLiveRegion="polite" testID="pf-erreur"
            style={{ flexDirection: 'row', gap: 10, alignItems: 'center', padding: 13, borderRadius: 14, backgroundColor: 'rgba(192,57,43,0.07)' }}>
            <Feather name="alert-circle" size={18} color={couleurs.rouge} />
            <Texte taille={13.5} style={{ flex: 1, lineHeight: 19 }}>{message}</Texte>
          </View>
        ) : null}

        <Bouton titre={t('pf.enregistrer')} onPress={enregistrer} occupe={occupe} icone="check" style={{ marginTop: 6 }} testID="pf-enregistrer" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
