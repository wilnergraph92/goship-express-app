// Mes avantages : GOPOINTS, offre de bienvenue (GOship APP Welcome) et parrainage (GOship Refer),
// plus la préférence du message d'anniversaire.
//
// Cet écran ne calcule rien : le solde, les offres, le statut d'un avantage et le code de
// parrainage viennent de la base (voir lib/api.js). Un avantage n'est jamais montré comme acquis
// avant qu'elle le dise, le parrain ne voit jamais l'identité ni les opérations d'un filleul, et
// une partie dont la base n'a pas encore le fichier SQL n'est tout simplement pas affichée.

import { useState } from 'react';
import { View, ScrollView, Pressable, Share, Switch, TextInput, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Feather } from '@expo/vector-icons';
import EnTete from '../components/EnTete';
import { Texte, Mono, Etiquette, Bouton } from '../components/ui';
import { couleurs, rayons, ombres } from '../lib/theme';
import { useLangue } from '../lib/i18n';
import { useDonnees } from '../lib/useDonnees';
import { dateCourte } from '../lib/format';
import { messageErreur } from '../lib/erreurs';
import {
  monPortefeuille, maBienvenue, monParrainage, mesPreferences, utiliserPoints, noterInvitation,
  utiliserCodeParrainage, reglerAnniversaire, nouvelleCle,
} from '../lib/api';
import { normaliserCodeParrain, messageInvitation } from '../lib/programmes';

export default function Avantages() {
  const { t, langue } = useLangue();
  const points = useDonnees(() => monPortefeuille(0), []);
  const bienvenue = useDonnees(() => maBienvenue(), []);
  const parrainage = useDonnees(() => monParrainage(), []);
  const prefs = useDonnees(() => mesPreferences(), []);
  const [message, setMessage] = useState(null); // { type: 'ok' | 'erreur', texte }

  const w = points.donnees, b = bienvenue.donnees, r = parrainage.donnees, p = prefs.donnees;
  const rien = !(w && (w.actif || w.total)) && !b && !(r && (r.actif || r.inscrits)) && !p;
  const charge = [points, bienvenue, parrainage, prefs].every((x) => !x.chargement);
  const recharger = () => { points.recharger(); bienvenue.recharger(); parrainage.recharger(); };
  const montrer = (type, texte) => { setMessage({ type, texte }); if (type === 'ok') setTimeout(() => setMessage(null), 3200); };
  const echec = (e) => montrer('erreur', messageErreur(e, t));
  const nbPoints = (n) => (n === 1 ? t('av.points.un') : t('av.points.n', { n }));

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <EnTete titre={t('av.titre')} retour>
        <Texte taille={12.5} style={{ marginTop: 12, color: couleurs.surNuit, lineHeight: 19 }}>{t('av.intro')}</Texte>
      </EnTete>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40, gap: 14 }} keyboardShouldPersistTaps="handled">
        {message ? (
          <View style={[styles.message, message.type === 'ok' ? styles.messageOk : styles.messageErreur]} accessibilityLiveRegion="polite" testID="av-message">
            <Texte taille={13.5} style={{ flex: 1, lineHeight: 19 }}>{message.texte}</Texte>
          </View>
        ) : null}
        {charge && rien ? (
          <View style={[styles.carte, ombres.carte]} testID="av-vide">
            <Texte doux taille={14} style={{ lineHeight: 20 }}>{t('av.vide')}</Texte>
          </View>
        ) : null}

        {b ? <Bienvenue b={b} t={t} langue={langue} /> : null}
        {w && (w.actif || w.total) ? (
          <Points w={w} t={t} langue={langue} nbPoints={nbPoints} onEchange={async (offre, cle) => {
            try {
              const res = await utiliserPoints(offre.id, cle);
              montrer('ok', t(res.deja ? 'av.points.deja' : 'av.points.ok'));
              recharger();
            } catch (e) { echec(e); }
          }} />
        ) : null}
        {r && (r.actif || r.inscrits || (r.recompenses && r.recompenses.length)) ? (
          <Parrainage r={r} t={t} langue={langue} montrer={montrer} echec={echec} recharger={recharger} />
        ) : null}
        {p ? (
          <View style={[styles.carte, ombres.carte, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
            <View style={{ flex: 1 }}>
              <Texte gras taille={14.5}>{t('av.anniv.titre')}</Texte>
              <Texte doux taille={13} style={{ marginTop: 3 }}>{t('av.anniv.libelle')}</Texte>
            </View>
            <Switch
              value={!!p.anniversaire}
              onValueChange={async (v) => {
                prefs.setDonnees({ ...p, anniversaire: v });
                try { await reglerAnniversaire(v); montrer('ok', t('av.anniv.ok')); } catch (e) { prefs.recharger(); echec(e); }
              }}
              accessibilityLabel={t('av.anniv.libelle')}
              testID="av-anniversaire"
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Statut({ cle, t }) {
  const bon = ['obtenu', 'obtenue', 'utilisee'].indexOf(cle) >= 0;
  const mauvais = ['expire', 'expiree', 'annulee'].indexOf(cle) >= 0;
  return (
    <View style={[styles.statut, bon && { backgroundColor: '#e4f6ea' }, mauvais && { backgroundColor: '#fdebd8' }]}>
      <Texte gras taille={11.5} style={{ color: bon ? '#14663a' : mauvais ? '#9a3d0a' : '#1747b3' }}>{t(cle)}</Texte>
    </View>
  );
}

function Bienvenue({ b, t, langue }) {
  return (
    <View style={[styles.carte, ombres.carte, { gap: 10 }]} testID="av-bienvenue">
      <View style={styles.tete}>
        <Texte gras taille={16} style={{ flex: 1 }}>{b.nom || t('av.bienvenue.titre')}</Texte>
        <Statut cle={'av.bienvenue.' + b.statut} t={t} />
      </View>
      {b.description ? <Texte doux taille={13.5} style={{ lineHeight: 19 }}>{b.description}</Texte> : null}
      <Texte gras taille={14.5}>{t('av.bienvenue.avantage', { avantage: b.avantage })}</Texte>
      {(b.etapes || []).map((e) => (
        <View key={e.cle} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Feather name={e.fait ? 'check-circle' : 'circle'} size={18} color={e.fait ? couleurs.vert : couleurs.texteFaible} />
          <Texte taille={14}>{t(e.cle === 'compte' ? 'av.bienvenue.compte' : 'av.bienvenue.' + b.operation)}</Texte>
        </View>
      ))}
      {b.statut === 'en_attente' ? <Texte doux taille={13} style={{ lineHeight: 19 }}>{t('av.bienvenue.attente')}</Texte> : null}
      {b.fin && b.statut === 'a_debloquer' ? <Texte doux taille={13}>{t('av.bienvenue.fin', { date: dateCourte(b.fin, langue) })}</Texte> : null}
      {b.conditions ? <Conditions texte={b.conditions} t={t} /> : null}
    </View>
  );
}

function Conditions({ texte, t }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <View>
      <Pressable onPress={() => setOuvert((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: ouvert }} style={{ minHeight: 44, justifyContent: 'center' }}>
        <Texte gras taille={13.5} style={{ color: couleurs.accent }}>{t('av.conditions')} {ouvert ? '▲' : '▼'}</Texte>
      </Pressable>
      {ouvert ? <Texte doux taille={13} style={{ lineHeight: 19 }}>{texte}</Texte> : null}
    </View>
  );
}

function Points({ w, t, langue, nbPoints, onEchange }) {
  // Une clé par offre et par appui : un double appui ou une coupure ne dépense qu'une fois
  const [cles] = useState({});
  const [occupe, setOccupe] = useState(null);
  return (
    <View style={[styles.carte, ombres.carte, { gap: 12 }]} testID="av-points">
      <View style={styles.tete}>
        <Texte gras taille={16}>{t('av.points.titre')}</Texte>
        <Texte gras taille={24} testID="av-solde">{nbPoints(w.solde)}</Texte>
      </View>
      {!w.actif ? <Texte doux taille={13}>{t('av.points.ferme')}</Texte> : null}
      {w.offres && w.offres.length ? (
        <View style={{ gap: 10 }}>
          <Etiquette>{t('av.points.offres')}</Etiquette>
          {w.offres.map((o) => (
            <View key={o.id} style={styles.offre} testID={'av-offre-' + o.id}>
              <View style={{ flex: 1, gap: 2 }}>
                <Texte gras taille={14.5}>{o.nom}</Texte>
                {o.description ? <Texte doux taille={13}>{o.description}</Texte> : null}
                <Texte doux taille={12.5}>{nbPoints(o.cout_points)}{o.fin ? ' · ' + t('av.bienvenue.fin', { date: dateCourte(o.fin, langue) }) : ''}</Texte>
              </View>
              <Bouton
                titre={t('av.points.echanger')}
                variante="sombre"
                desactive={w.solde < o.cout_points}
                occupe={occupe === o.id}
                style={{ minHeight: 44, paddingHorizontal: 14 }}
                onPress={async () => {
                  cles[o.id] = cles[o.id] || nouvelleCle();
                  setOccupe(o.id);
                  try { await onEchange(o, cles[o.id]); delete cles[o.id]; } finally { setOccupe(null); }
                }}
                testID={'av-echanger-' + o.id}
              />
            </View>
          ))}
        </View>
      ) : null}
      <View style={{ gap: 6 }}>
        <Etiquette>{t('av.points.historique')}</Etiquette>
        {w.elements && w.elements.length ? w.elements.slice(0, 10).map((m) => (
          <View key={m.id} style={[styles.ligne, m.statut === 'annule' && { opacity: 0.5 }]}>
            <Texte taille={13.5} style={{ flex: 1 }}>{t('av.mv.' + m.type)} · {dateCourte(m.date, langue)}</Texte>
            <Texte gras taille={14} style={{ color: m.points > 0 ? '#14663a' : couleurs.rouge }}>{(m.points > 0 ? '+' : '') + m.points}</Texte>
          </View>
        )) : <Texte doux taille={13}>{t('av.points.vide')}</Texte>}
      </View>
      {w.conditions ? <Conditions texte={w.conditions} t={t} /> : null}
    </View>
  );
}

function Parrainage({ r, t, langue, montrer, echec, recharger }) {
  const [copie, setCopie] = useState(null);
  const [code, setCode] = useState('');
  const [occupe, setOccupe] = useState(false);
  const message = messageInvitation(t('av.refer.message'), r.code, r.lien);

  async function copier(cle, texte) {
    try {
      await Clipboard.setStringAsync(texte);
      setCopie(cle);
      setTimeout(() => setCopie((c) => (c === cle ? null : c)), 1800);
      noterInvitation(cle).catch(() => {});
    } catch (e) { setCopie(null); }
  }
  // Le partage natif de l'appareil ; une invitation n'est comptée que si le partage a eu lieu
  async function partager() {
    try {
      const res = await Share.share({ message });
      if (res.action !== Share.dismissedAction) noterInvitation('partage').catch(() => {});
    } catch (e) { /* partage annulé ou indisponible : rien à compter */ }
  }

  return (
    <View style={[styles.carte, ombres.carte, { gap: 12 }]} testID="av-parrainage">
      <Texte gras taille={16}>{r.nom || t('av.refer.titre')}</Texte>
      <Texte taille={14} style={{ lineHeight: 20 }}>{t('av.refer.texte')}</Texte>
      {!r.actif ? <Texte doux taille={13}>{t('av.refer.inactif')}</Texte> : null}
      {r.avantage_parrain ? <Texte gras taille={14}>{t('av.refer.parrain', { avantage: r.avantage_parrain })}</Texte> : null}
      {r.avantage_filleul ? <Texte gras taille={14}>{t('av.refer.filleul', { avantage: r.avantage_filleul })}</Texte> : null}
      {r.actif ? (
        <View style={styles.invitation}>
          <Etiquette>{t('av.refer.code')}</Etiquette>
          <Mono taille={24} couleur={couleurs.texte} selectable testID="av-code">{r.code}</Mono>
          <Bouton titre={t('av.refer.cta')} icone="share-2" onPress={partager} style={{ minHeight: 52 }} testID="av-partager" />
          <View style={{ flexDirection: 'row', gap: 9 }}>
            <Bouton titre={copie === 'code' ? t('av.refer.copie') : t('av.refer.copier_code')} icone={copie === 'code' ? 'check' : 'copy'} variante="secondaire"
              onPress={() => copier('code', r.code)} style={{ flex: 1, minHeight: 46 }} testID="av-copier-code" />
            {r.lien ? (
              <Bouton titre={copie === 'lien' ? t('av.refer.copie') : t('av.refer.copier_lien')} icone={copie === 'lien' ? 'check' : 'link'} variante="secondaire"
                onPress={() => copier('lien', r.lien)} style={{ flex: 1, minHeight: 46 }} testID="av-copier-lien" />
            ) : null}
          </View>
        </View>
      ) : null}
      <View style={styles.chiffres}>
        {[['av.refer.invitations', r.invitations], ['av.refer.inscrits', r.inscrits], ['av.refer.attente', r.en_attente_premiere_operation], ['av.refer.valides', r.valides]].map(([k, v]) => (
          <View key={k} style={styles.chiffre}>
            <Texte doux taille={12}>{t(k)}</Texte>
            <Texte gras taille={20}>{v}</Texte>
          </View>
        ))}
      </View>
      {r.recompenses && r.recompenses.length ? (
        <View style={{ gap: 6 }}>
          <Etiquette>{t('av.refer.recompenses')}</Etiquette>
          {r.recompenses.map((x) => (
            <View key={x.id} style={styles.ligne}>
              <Texte taille={13.5} style={{ flex: 1 }}>{x.avantage} · {dateCourte(x.date, langue)}</Texte>
              <Statut cle={'av.statut.' + x.statut} t={t} />
            </View>
          ))}
        </View>
      ) : null}
      {r.actif && !r.mon_parrain ? (
        <View style={{ gap: 8 }}>
          <Etiquette>{t('av.refer.j_ai_un_code')}</Etiquette>
          <View style={{ flexDirection: 'row', gap: 9 }}>
            <TextInput
              value={code}
              onChangeText={(v) => setCode(normaliserCodeParrain(v))}
              autoCapitalize="characters" autoCorrect={false} maxLength={24}
              placeholder={t('av.refer.code_champ')} placeholderTextColor={couleurs.texteFaible}
              accessibilityLabel={t('av.refer.code_champ')} style={styles.saisie} testID="av-saisie-code"
            />
            <Bouton titre={t('av.refer.code_envoyer')} variante="sombre" occupe={occupe} desactive={code.length < 4} style={{ minHeight: 48, paddingHorizontal: 14 }}
              onPress={async () => {
                setOccupe(true);
                try { await utiliserCodeParrainage(code); setCode(''); montrer('ok', t('av.refer.code_ok')); recharger(); } catch (e) { echec(e); } finally { setOccupe(false); }
              }} testID="av-envoyer-code" />
          </View>
        </View>
      ) : null}
      {r.conditions || r.annulation ? <Conditions texte={[r.conditions, r.annulation].filter(Boolean).join('\n\n')} t={t} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  carte: { backgroundColor: couleurs.carte, borderRadius: rayons.carte, borderWidth: 1, borderColor: couleurs.bord, padding: 16 },
  tete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  statut: { paddingHorizontal: 10, minHeight: 26, borderRadius: 13, backgroundColor: '#e7efff', justifyContent: 'center' },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 34 },
  offre: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: couleurs.bord },
  invitation: { gap: 10, padding: 14, borderRadius: rayons.carte, borderWidth: 1, borderStyle: 'dashed', borderColor: couleurs.bordFort, backgroundColor: couleurs.fond },
  chiffres: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chiffre: { flexBasis: '47%', flexGrow: 1, gap: 2, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: couleurs.bord },
  saisie: { flex: 1, minHeight: 48, paddingHorizontal: 14, borderRadius: rayons.champ, borderWidth: 1, borderColor: couleurs.bord, backgroundColor: couleurs.carte, color: couleurs.texte },
  message: { flexDirection: 'row', padding: 12, borderRadius: 14, borderWidth: 1 },
  messageOk: { backgroundColor: '#e4f6ea', borderColor: '#b8e3c7' },
  messageErreur: { backgroundColor: '#fdecec', borderColor: '#f3c4c4' },
});
