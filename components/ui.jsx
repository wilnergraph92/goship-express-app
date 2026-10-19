// Briques visuelles réutilisées par tous les écrans.

import { useRef, useState } from 'react';
import { Text, View, Pressable, TextInput, ActivityIndicator, StyleSheet, Modal, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { couleurs, polices, rayons, ombres } from '../lib/theme';
import { useLangue } from '../lib/i18n';
import { classer, messageErreur } from '../lib/erreurs';

export function Titre({ children, style, taille = 22, couleur = couleurs.texte, ...reste }) {
  return (
    <Text accessibilityRole="header" style={[{ fontFamily: polices.titre, fontSize: taille, color: couleur }, style]} {...reste}>
      {children}
    </Text>
  );
}

export function Texte({ children, style, gras, doux, taille = 14.5, ...reste }) {
  return (
    <Text
      style={[
        {
          fontFamily: gras ? polices.corpsGras : polices.corps,
          fontSize: taille,
          color: doux ? couleurs.texteDoux : couleurs.texte,
        },
        style,
      ]}
      {...reste}
    >
      {children}
    </Text>
  );
}

export function Mono({ children, style, taille = 13, couleur = couleurs.texte, ...reste }) {
  return (
    <Text style={[{ fontFamily: polices.monoGras, fontSize: taille, color: couleur, letterSpacing: 0.4 }, style]} {...reste}>
      {children}
    </Text>
  );
}

export function Etiquette({ children, style, couleur = couleurs.texteFaible }) {
  return (
    <Text
      style={[
        { fontFamily: polices.mono, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: couleur },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Carte({ children, style }) {
  return <View style={[styles.carte, ombres.carte, style]}>{children}</View>;
}

// Un bouton occupé ne répond plus (pas de double envoi) et le dit au lecteur d'écran
export function Bouton({ titre, onPress, icone, variante = 'principal', occupe, style, desactive, testID, accessibilityLabel }) {
  const secondaire = variante === 'secondaire';
  const sombre = variante === 'sombre';
  const fond = secondaire ? couleurs.carte : sombre ? couleurs.nuit : couleurs.accent;
  const texte = secondaire ? couleurs.texte : '#ffffff';
  return (
    <Pressable
      onPress={desactive || occupe ? undefined : onPress}
      style={({ pressed }) => [
        styles.bouton,
        { backgroundColor: fond, opacity: desactive ? 0.5 : pressed ? 0.85 : 1 },
        secondaire && { borderWidth: 1.5, borderColor: couleurs.bordFort },
        !secondaire && !sombre && ombres.bouton,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || titre}
      accessibilityState={{ disabled: !!(desactive || occupe), busy: !!occupe }}
      testID={testID}
    >
      {occupe ? (
        <ActivityIndicator color={texte} />
      ) : (
        <>
          {icone ? <Feather name={icone} size={18} color={texte} style={{ marginRight: 9 }} /> : null}
          <Text style={{ fontFamily: polices.corpsTresGras, fontSize: 15.5, color: texte }} numberOfLines={1}>{titre}</Text>
        </>
      )}
    </Pressable>
  );
}

// Un champ, son étiquette et, le cas échéant, l'erreur qui le concerne
export function Champ({ etiquette, style, apres, erreur, testID, ...reste }) {
  return (
    <View style={[{ gap: 7 }, style]}>
      {etiquette ? <Etiquette>{etiquette}</Etiquette> : null}
      <View style={[styles.champBoite, erreur ? { borderColor: couleurs.rouge } : null]}>
        <TextInput
          placeholderTextColor={couleurs.texteFaible}
          style={styles.champ}
          accessibilityLabel={etiquette || reste.placeholder}
          testID={testID}
          {...reste}
        />
        {apres}
      </View>
      {erreur ? (
        <Texte taille={12.5} style={{ color: couleurs.rouge }} accessibilityLiveRegion="polite" testID={testID ? testID + '-erreur' : undefined}>
          {erreur}
        </Texte>
      ) : null}
    </View>
  );
}

// La date de naissance en trois cases (jour, mois, année), au clavier numérique. Elle rend
// { jour, mois, annee } en texte ; lib/naissance.js en fait le jour civil « AAAA-MM-JJ »,
// sans fuseau. Le curseur passe tout seul à la case suivante quand celle-ci est pleine.
export function ChampDate({ etiquette, aide, valeur, onChange, erreur, testID }) {
  const { t } = useLangue();
  const refs = { mois: useRef(null), annee: useRef(null) };
  const v = valeur || { jour: '', mois: '', annee: '' };
  const poser = (cle, longueur, suivante) => (texte) => {
    const chiffres = String(texte).replace(/\D/g, '').slice(0, longueur);
    onChange({ ...v, [cle]: chiffres });
    if (suivante && chiffres.length === longueur && refs[suivante].current) refs[suivante].current.focus();
  };
  const case_ = (cle, libelle, longueur, suivante, largeur, ref) => (
    <View style={{ flex: largeur, gap: 5 }}>
      <Text style={{ fontFamily: polices.mono, fontSize: 9.5, letterSpacing: 1, textTransform: 'uppercase', color: couleurs.texteFaible }}>{libelle}</Text>
      <View style={[styles.champBoite, erreur ? { borderColor: couleurs.rouge } : null]}>
        <TextInput
          ref={ref}
          value={v[cle]}
          onChangeText={poser(cle, longueur, suivante)}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={longueur}
          placeholder={cle === 'annee' ? 'AAAA' : cle === 'mois' ? 'MM' : 'JJ'}
          placeholderTextColor={couleurs.texteFaible}
          style={[styles.champ, { textAlign: 'center' }]}
          accessibilityLabel={`${etiquette} — ${libelle}`}
          testID={testID ? `${testID}-${cle}` : undefined}
        />
      </View>
    </View>
  );
  return (
    <View style={{ gap: 7 }}>
      {etiquette ? <Etiquette>{etiquette}</Etiquette> : null}
      <View style={{ flexDirection: 'row', gap: 9 }}>
        {case_('jour', t('nz.jour'), 2, 'mois', 1, null)}
        {case_('mois', t('nz.mois'), 2, 'annee', 1, refs.mois)}
        {case_('annee', t('nz.annee'), 4, null, 1.6, refs.annee)}
      </View>
      {aide && !erreur ? <Texte doux taille={12} style={{ lineHeight: 17 }}>{aide}</Texte> : null}
      {erreur ? (
        <Texte taille={12.5} style={{ color: couleurs.rouge }} accessibilityLiveRegion="polite" testID={testID ? testID + '-erreur' : undefined}>
          {erreur}
        </Texte>
      ) : null}
    </View>
  );
}

// Un choix parmi quelques options, en pastilles (sexe, document, pays) : comme les listes du formulaire
// du site, mais toutes visibles d'un coup. options : [{ valeur, libelle }].
export function ChoixPastilles({ etiquette, options, valeur, onChange, erreur, testID }) {
  return (
    <View style={{ gap: 7 }}>
      {etiquette ? <Etiquette>{etiquette}</Etiquette> : null}
      <View style={{ flexDirection: 'row', gap: 8 }} accessibilityRole="radiogroup">
        {options.map((o) => {
          const choisi = valeur === o.valeur;
          return (
            <Pressable
              key={o.valeur}
              onPress={() => onChange(o.valeur)}
              accessibilityRole="radio"
              accessibilityState={{ selected: choisi }}
              testID={testID ? testID + '-' + o.valeur : undefined}
              style={{
                flex: 1,
                minHeight: 50,
                paddingHorizontal: 6,
                paddingVertical: 6,
                borderRadius: rayons.champ,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: choisi ? couleurs.nuit : couleurs.carte,
                borderWidth: 1,
                borderColor: choisi ? couleurs.nuit : erreur ? couleurs.rouge : couleurs.bord,
              }}
            >
              <Texte gras taille={13} style={{ color: choisi ? '#ffffff' : couleurs.texte, textAlign: 'center' }} numberOfLines={2}>
                {o.libelle}
              </Texte>
            </Pressable>
          );
        })}
      </View>
      {erreur ? (
        <Texte taille={12.5} style={{ color: couleurs.rouge }} accessibilityLiveRegion="polite" testID={testID ? testID + '-erreur' : undefined}>
          {erreur}
        </Texte>
      ) : null}
    </View>
  );
}

// Une liste de choix qui s'ouvre au toucher (région, ville) : le « select » du formulaire du site.
// Fait avec Modal et FlatList, qui sont dans React Native : aucun module natif de plus, donc la
// mise à jour à distance suffit. options : [{ valeur, libelle }] ; desactive : fermé tant qu'une
// autre case n'est pas remplie (la région attend le pays).
export function ChampChoix({ etiquette, invite, options, valeur, onChange, desactive, erreur, testID }) {
  const { t } = useLangue();
  const [ouvert, setOuvert] = useState(false);
  const choisi = options.find((o) => o.valeur === valeur);
  return (
    <View style={{ gap: 7 }}>
      {etiquette ? <Etiquette>{etiquette}</Etiquette> : null}
      <Pressable
        onPress={() => { if (!desactive) setOuvert(true); }}
        accessibilityRole="button"
        accessibilityLabel={etiquette}
        accessibilityState={{ disabled: !!desactive, expanded: ouvert }}
        testID={testID}
        style={[styles.champBoite, { minHeight: 54, paddingHorizontal: 16, opacity: desactive ? 0.55 : 1 }, erreur ? { borderColor: couleurs.rouge } : null]}
      >
        <Texte taille={15.5} style={{ flex: 1, color: choisi ? couleurs.texte : couleurs.texteFaible }} numberOfLines={1}>
          {choisi ? choisi.libelle : invite}
        </Texte>
        <Feather name="chevron-down" size={18} color={couleurs.texteFaible} />
      </Pressable>
      {erreur ? (
        <Texte taille={12.5} style={{ color: couleurs.rouge }} accessibilityLiveRegion="polite" testID={testID ? testID + '-erreur' : undefined}>
          {erreur}
        </Texte>
      ) : null}
      <Modal visible={ouvert} transparent animationType="fade" onRequestClose={() => setOuvert(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(6,26,63,0.45)', justifyContent: 'flex-end' }} onPress={() => setOuvert(false)} accessibilityLabel={t('gen.fermer')}>
          <Pressable
            onPress={() => {}}
            style={{ backgroundColor: couleurs.carte, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '72%', paddingTop: 16 }}
          >
            <Texte gras taille={15} style={{ paddingHorizontal: 20, paddingBottom: 10 }}>{etiquette || invite}</Texte>
            <FlatList
              data={options}
              keyExtractor={(o) => o.valeur}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => { onChange(item.valeur); setOuvert(false); }}
                  accessibilityRole="button"
                  testID={testID ? testID + '-option-' + item.valeur : undefined}
                  style={{ paddingVertical: 15, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: couleurs.bord, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                >
                  <Texte taille={15.5} gras={item.valeur === valeur} style={{ flex: 1 }}>{item.libelle}</Texte>
                  {item.valeur === valeur ? <Feather name="check" size={18} color={couleurs.nuit} /> : null}
                </Pressable>
              )}
            />
            <Pressable onPress={() => setOuvert(false)} accessibilityRole="button" style={{ padding: 18, alignItems: 'center', borderTopWidth: 1, borderTopColor: couleurs.bord }}>
              <Texte gras doux taille={14}>{t('gen.fermer')}</Texte>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export function Vide({ icone = 'package', titre, texte, children, testID }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 30, gap: 12 }} testID={testID}>
      <View style={styles.videRond}>
        <Feather name={icone} size={30} color={couleurs.texteFaible} />
      </View>
      <Titre taille={17} style={{ textAlign: 'center' }}>{titre}</Titre>
      {texte ? <Texte doux taille={14} style={{ textAlign: 'center', lineHeight: 21 }}>{texte}</Texte> : null}
      {children}
    </View>
  );
}

export function Chargement({ texte }) {
  const { t } = useLangue();
  return (
    <View style={{ paddingVertical: 60, alignItems: 'center', gap: 14 }} accessibilityLiveRegion="polite">
      <ActivityIndicator color={couleurs.accent} size="large" accessibilityLabel={texte || t('gen.chargement')} />
      {texte ? <Texte doux taille={13.5}>{texte}</Texte> : null}
    </View>
  );
}

// Un écran qui n'a rien pu charger : il dit pourquoi, et propose de réessayer
const ICONES_ERREUR = { reseau: 'wifi-off', delai: 'clock', refus: 'lock', introuvable: 'search', session: 'log-in' };
export function EtatErreur({ erreur, onReessayer, titre }) {
  const { t } = useLangue();
  const c = classer(erreur);
  return (
    <Vide icone={ICONES_ERREUR[c.type] || 'alert-circle'} titre={titre || t('etat.' + (ICONES_ERREUR[c.type] ? c.type : 'erreur'))}
      texte={messageErreur(erreur, t)} testID={'etat-' + c.type}>
      {onReessayer && c.type !== 'refus' && c.type !== 'introuvable' ? (
        <Bouton titre={t('gen.reessayer')} icone="refresh-cw" variante="secondaire" onPress={onReessayer}
          style={{ marginTop: 6, alignSelf: 'stretch' }} testID="reessayer" />
      ) : null}
    </Vide>
  );
}

// Des données sont affichées, mais la dernière mise à jour a échoué
export function Bandeau({ erreur, onReessayer }) {
  const { t } = useLangue();
  if (!erreur) return null;
  const c = classer(erreur);
  const horsLigne = c.type === 'reseau' || c.type === 'delai';
  return (
    <Pressable onPress={onReessayer} accessibilityRole="button" style={styles.bandeau} testID="bandeau-erreur"
      accessibilityLabel={(horsLigne ? t('etat.perimee') : messageErreur(erreur, t)) + ' ' + t('gen.reessayer')}>
      <Feather name={horsLigne ? 'wifi-off' : 'alert-triangle'} size={16} color="#8a4b00" />
      <Texte taille={12.5} style={{ flex: 1, color: '#6b3a00', lineHeight: 18 }}>
        {horsLigne ? t('etat.perimee') : messageErreur(erreur, t)}
      </Texte>
      {onReessayer ? <Feather name="refresh-cw" size={15} color="#8a4b00" /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  carte: {
    backgroundColor: couleurs.carte,
    borderRadius: rayons.carte,
    borderWidth: 1,
    borderColor: couleurs.bord,
    padding: 17,
  },
  bouton: {
    minHeight: 54,
    borderRadius: rayons.bouton,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  champBoite: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.carte,
    borderWidth: 1,
    borderColor: couleurs.bord,
    borderRadius: rayons.champ,
    paddingRight: 6,
  },
  champ: {
    flex: 1,
    minHeight: 54,
    paddingHorizontal: 16,
    fontFamily: polices.corps,
    fontSize: 15.5,
    color: couleurs.texte,
  },
  videRond: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: '#eef2f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bandeau: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 18,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: '#fff4e0',
    borderWidth: 1,
    borderColor: '#f6d79c',
  },
});
