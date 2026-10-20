// Création d'un compte client (le code GSE est attribué automatiquement par la base).

import { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import EnTete from '../components/EnTete';
import { Texte, Bouton, Champ, ChampDate, ChoixPastilles, ChampChoix } from '../components/ui';
import { couleurs } from '../lib/theme';
import { useLangue } from '../lib/i18n';
import { useSession, MDP_MINIMUM, emailValide } from '../lib/session';
import { classer } from '../lib/erreurs';
import { lireNaissance, MESSAGE_NAISSANCE } from '../lib/naissance';
import BoutonGoogle from '../components/BoutonGoogle';
import { normaliserCodeParrain } from '../lib/programmes';
import { REGIONS, ETATS_US } from '../lib/lieux';
import { SEXES, DOCUMENTS, numeroDocument, TELEPHONE_EXEMPLE, nomComplet, telephoneValide } from '../lib/identite';

const PAYS = ['HT', 'DO', 'US'];

// Les clés de texte écrites en toutes lettres : l'essai de traductions ne suit pas les clés composées
const CLE_SEXE = { M: 'ins.sexe_M', F: 'ins.sexe_F' };
const CLE_DOCUMENT = { passeport: 'ins.doc_passeport', cedula: 'ins.doc_cedula' };
const CLE_NUMERO = {
  aucun: ['ins.num_aucun', 'ins.num_aucun_ex'],
  passeport: ['ins.num_passeport', 'ins.num_passeport_ex'],
  cedula: ['ins.num_cedula', 'ins.num_cedula_ex'],
};
const CLE_ERREUR_NUMERO = { passeport: 'ins.err_num_passeport', cedula: 'ins.err_num_cedula' };

// Marque « Autre ville… » dans la liste des communes : la ville se saisit alors à la main
const AUTRE = '__autre';

// Les communes se rangent par ordre alphabétique français, comme sur le site
const trier = (liste) => liste.slice().sort((a, b) => a.localeCompare(b, 'fr'));

export default function Inscription() {
  const { t, langue } = useLangue();
  const { inscription, fournisseurs, connexionAvec } = useSession();

  // Les mêmes champs, dans le même ordre que le formulaire du site : tout est obligatoire sauf le parrain
  const [champs, setChamps] = useState({
    nom_complet: '', sexe: '', type_document: '', numero_document: '', code_parrainage: '',
    pays: '', region: '', ville: '', ville_libre: '', adresse: '', telephone: '', email: '', motDePasse: '',
  });
  const [naissance, setNaissance] = useState({ jour: '', mois: '', annee: '' });
  const [erreurs, setErreurs] = useState({});
  const [message, setMessage] = useState(null);
  const [occupe, setOccupe] = useState(false);
  const [occupeGoogle, setOccupeGoogle] = useState(false);

  const poser = (cle) => (valeur) => {
    setChamps((c) => ({ ...c, [cle]: valeur }));
    setErreurs((e) => ({ ...e, [cle]: undefined }));
    setMessage(null);
  };

  // Changer de pays vide la région et la ville ; changer de région vide la ville
  const choisirPays = (p) => {
    setChamps((c) => ({ ...c, pays: p, region: '', ville: '', ville_libre: '' }));
    setErreurs((e) => ({ ...e, pays: undefined, region: undefined, ville: undefined }));
    setMessage(null);
  };
  const choisirRegion = (r) => {
    setChamps((c) => ({ ...c, region: r, ville: '', ville_libre: '' }));
    setErreurs((e) => ({ ...e, region: undefined, ville: undefined }));
    setMessage(null);
  };
  // Changer de document change le numéro attendu : l'ancien ne vaut plus pour l'autre
  const choisirDocument = (d) => {
    setChamps((c) => ({ ...c, type_document: d, numero_document: '' }));
    setErreurs((e) => ({ ...e, type_document: undefined, numero_document: undefined }));
    setMessage(null);
  };

  const regions = champs.pays === 'US' ? ETATS_US : champs.pays ? Object.keys(REGIONS[champs.pays] || {}) : [];
  const communes = champs.pays !== 'US' && REGIONS[champs.pays] && REGIONS[champs.pays][champs.region];
  // Aux États-Unis et pour « Autre ville… », la ville se saisit à la main
  const villeLibre = champs.pays === 'US' || champs.ville === AUTRE;
  const doc = champs.type_document || 'aucun';

  async function creer() {
    if (occupe) return;
    const e = {};
    if (!nomComplet(champs.nom_complet)) e.nom_complet = t('ins.err_nom');
    // La date de naissance est obligatoire : sans elle valide, aucun compte n'est créé
    const n = lireNaissance(naissance);
    if (!n.valide) e.naissance = t(MESSAGE_NAISSANCE[n.code]);
    if (!champs.sexe) e.sexe = t('ins.requis');
    if (!champs.type_document) e.type_document = t('ins.requis');
    const numero = numeroDocument(champs.type_document, champs.numero_document);
    if (champs.type_document && !numero) e.numero_document = t(CLE_ERREUR_NUMERO[champs.type_document]);
    if (!champs.pays) e.pays = t('ins.requis');
    if (champs.pays && !champs.region) e.region = t('ins.requis');
    const ville = (villeLibre ? champs.ville_libre : champs.ville).trim();
    if (champs.region && !ville) e.ville = t('ins.requis');
    if (!champs.adresse.trim()) e.adresse = t('ins.requis');
    if (!telephoneValide(champs.telephone)) e.telephone = t('ins.err_tel');
    if (!emailValide(champs.email)) e.email = t('ins.err_email');
    if (String(champs.motDePasse).length < MDP_MINIMUM) e.motDePasse = t('ins.err_mdp');
    if (Object.keys(e).length) { setErreurs(e); return; }
    setOccupe(true);
    try {
      const res = await inscription({
        nom_complet: champs.nom_complet.trim(), email: champs.email, motDePasse: champs.motDePasse,
        telephone: champs.telephone, pays: champs.pays, region: champs.region, ville, adresse: champs.adresse.trim(),
        sexe: champs.sexe, type_document: champs.type_document, numero_document: numero,
        code_parrainage: champs.code_parrainage, date_naissance: n.iso, langue,
      });
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
      // La base a refusé la création du profil (date absente ou invalide) : GoTrue n'en dit pas plus
      else if (/Database error saving new user/i.test(String(err && err.message))) setErreurs({ naissance: t('nz.refusee') });
      else {
        const c = classer(err);
        setMessage({ type: 'erreur', texte: t('err.' + (['reseau', 'delai', 'serveur'].indexOf(c.type) >= 0 ? c.type : 'inconnue')) });
      }
    } finally {
      setOccupe(false);
    }
  }

  // S'inscrire avec Google : pas de mot de passe ; pays, ville et téléphone se complètent
  // ensuite (l'accueil le propose tant qu'ils manquent).
  async function google() {
    if (occupeGoogle) return;
    setOccupeGoogle(true);
    setMessage(null);
    try {
      await connexionAvec('google');
      router.replace('/(onglets)');
    } catch (e) {
      if (e && e.code === 'connexion-annulee') setMessage({ type: 'erreur', texte: t('cx.google_annule') });
      else {
        const c = classer(e);
        setMessage({ type: 'erreur', texte: c.type === 'reseau' || c.type === 'delai' ? t('err.' + c.type) : t('cx.google_echec') });
      }
    } finally {
      setOccupeGoogle(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <EnTete titre={t('in.titre')} retour>
        <Texte taille={12.5} style={{ marginTop: 12, color: couleurs.surNuit, lineHeight: 19 }}>{t('in.sous_titre')}</Texte>
      </EnTete>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40, gap: 14 }} keyboardShouldPersistTaps="handled">
        {fournisseurs.indexOf('google') >= 0 ? (
          <>
            <BoutonGoogle titre={t('cx.google')} onPress={google} occupe={occupeGoogle} testID="in-google" />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: couleurs.bord }} />
              <Texte doux taille={12}>{t('gen.ou')}</Texte>
              <View style={{ flex: 1, height: 1, backgroundColor: couleurs.bord }} />
            </View>
          </>
        ) : null}
        <Champ etiquette={t('ins.nom')} placeholder={t('ins.nom_ph')} value={champs.nom_complet} onChangeText={poser('nom_complet')}
          autoComplete="name" erreur={erreurs.nom_complet} maxLength={120} testID="in-nom" />
        <ChampDate etiquette={t('ins.naissance')} valeur={naissance} erreur={erreurs.naissance} testID="in-naissance"
          onChange={(v) => { setNaissance(v); setErreurs((x) => ({ ...x, naissance: undefined })); setMessage(null); }} />
        <ChoixPastilles etiquette={t('ins.sexe')} valeur={champs.sexe} onChange={poser('sexe')} erreur={erreurs.sexe} testID="in-sexe"
          options={SEXES.map((x) => ({ valeur: x, libelle: t(CLE_SEXE[x]) }))} />
        <ChoixPastilles etiquette={t('ins.document')} valeur={champs.type_document} onChange={choisirDocument}
          erreur={erreurs.type_document} testID="in-document"
          options={DOCUMENTS.map((x) => ({ valeur: x, libelle: t(CLE_DOCUMENT[x]) }))} />
        <Champ etiquette={t(CLE_NUMERO[doc][0])} placeholder={t(CLE_NUMERO[doc][1])} value={champs.numero_document}
          onChangeText={poser('numero_document')} editable={!!champs.type_document} autoCapitalize="characters" autoCorrect={false}
          maxLength={30} erreur={erreurs.numero_document} testID="in-numero" />
        <Champ etiquette={t('ins.parrain')} value={champs.code_parrainage} onChangeText={(v) => poser('code_parrainage')(normaliserCodeParrain(v))}
          autoCapitalize="characters" autoCorrect={false} maxLength={24} testID="in-parrain" />
        <ChampChoix etiquette={t('ins.pays')} invite={t('ins.pays_choisir')} valeur={champs.pays} onChange={choisirPays}
          erreur={erreurs.pays} testID="in-pays" options={PAYS.map((p) => ({ valeur: p, libelle: t('pays.' + p) }))} />
        <ChampChoix etiquette={t('ins.region')} invite={t(champs.pays ? 'ins.region_choisir' : 'ins.region_pays')} valeur={champs.region}
          onChange={choisirRegion} desactive={!champs.pays} erreur={erreurs.region} testID="in-region"
          options={regions.map((r) => ({ valeur: r, libelle: r }))} />
        {champs.pays === 'US' ? (
          <Champ etiquette={t('ins.ville')} placeholder={t('ins.ville_saisir')} value={champs.ville_libre} onChangeText={poser('ville_libre')}
            maxLength={80} erreur={erreurs.ville} testID="in-ville" />
        ) : (
          <>
            <ChampChoix etiquette={t('ins.ville')} invite={t('ins.ville_choisir')} valeur={champs.ville} onChange={poser('ville')}
              desactive={!communes} erreur={villeLibre ? undefined : erreurs.ville} testID="in-ville"
              options={communes ? trier(communes).map((v) => ({ valeur: v, libelle: v })).concat([{ valeur: AUTRE, libelle: t('ins.ville_autre') }]) : []} />
            {champs.ville === AUTRE ? (
              <Champ placeholder={t('ins.ville_saisir')} value={champs.ville_libre} onChangeText={poser('ville_libre')}
                maxLength={80} erreur={erreurs.ville} testID="in-ville-libre" />
            ) : null}
          </>
        )}
        <Champ etiquette={t('ins.adresse')} placeholder={t('ins.adresse_ph')} value={champs.adresse} onChangeText={poser('adresse')}
          autoComplete="street-address" maxLength={200} erreur={erreurs.adresse} testID="in-adresse" />
        <Champ etiquette={t('ins.tel')} placeholder={champs.pays ? TELEPHONE_EXEMPLE[champs.pays] : t('ins.tel_ph')} value={champs.telephone}
          onChangeText={poser('telephone')} keyboardType="phone-pad" autoComplete="tel" maxLength={40}
          erreur={erreurs.telephone} testID="in-telephone" />
        <Champ etiquette={t('ins.email')} placeholder={t('ins.email_ph')} value={champs.email} onChangeText={poser('email')}
          autoCapitalize="none" keyboardType="email-address" inputMode="email" autoComplete="email" erreur={erreurs.email}
          maxLength={160} testID="in-email" />
        <Champ etiquette={t('ins.mdp')} placeholder={t('ins.mdp_ph')} value={champs.motDePasse} onChangeText={poser('motDePasse')}
          secureTextEntry autoCapitalize="none" autoComplete="new-password" textContentType="newPassword"
          erreur={erreurs.motDePasse} testID="in-mdp" />
        <Texte doux taille={12.5} style={{ marginTop: -6 }}>{t('ins.mdp_aide')}</Texte>

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
          <Bouton titre={t('ins.creer')} onPress={creer} occupe={occupe} style={{ marginTop: 6 }} testID="in-creer" />
        )}

        <Pressable onPress={() => router.replace('/connexion')} style={{ alignItems: 'center', paddingVertical: 12 }} accessibilityRole="button">
          <Texte gras doux taille={14}>{t('in.deja')}</Texte>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
