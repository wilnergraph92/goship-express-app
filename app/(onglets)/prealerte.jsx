// Pré-alerte : le client annonce un achat avant son arrivée à Miami.

import { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, Pressable, KeyboardAvoidingView, Platform, Alert, StyleSheet } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { couleurs, rayons, ombres } from '../../lib/theme';
import { Titre, Texte, Mono, Etiquette, Bouton, Champ } from '../../components/ui';
import { useLangue } from '../../lib/i18n';
import { useSession } from '../../lib/session';
import { creerPrealerte, mesPrealertes, supprimerPrealerte } from '../../lib/api';
import { dateCourte, montant } from '../../lib/format';

const MAGASINS = ['Amazon', 'SHEIN', 'Walmart', 'eBay', 'Temu', 'AliExpress'];

export default function PreAlerte() {
  const { t, langue } = useLangue();
  const { profil } = useSession();
  const marges = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const [magasin, setMagasin] = useState('');
  const [description, setDescription] = useState('');
  const [suivi, setSuivi] = useState('');
  const [valeur, setValeur] = useState('');
  const [service, setService] = useState('aerien');
  const [photo, setPhoto] = useState(null);
  const [occupe, setOccupe] = useState(false);
  const [liste, setListe] = useState([]);

  // Code renvoyé par le scanner
  useEffect(() => {
    if (params.suivi) setSuivi(String(params.suivi));
  }, [params.suivi]);

  const charger = useCallback(async () => {
    try {
      setListe(await mesPrealertes());
    } catch (e) {
      setListe([]); // la table n'existe pas encore : l'écran reste utilisable
    }
  }, []);

  useFocusEffect(useCallback(() => { charger(); }, [charger]));

  async function choisirPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!res.canceled && res.assets?.length) setPhoto(res.assets[0]);
  }

  async function envoyer() {
    if (!magasin.trim() || !description.trim()) {
      Alert.alert('GoShip Express', t('pa.requis'));
      return;
    }
    setOccupe(true);
    try {
      await creerPrealerte({
        client_id: profil?.id,
        magasin: magasin.trim(),
        description: description.trim(),
        suivi_transporteur: suivi.trim(),
        valeur_usd: valeur ? Number(String(valeur).replace(',', '.')) : null,
        service,
      });
      setMagasin(''); setDescription(''); setSuivi(''); setValeur(''); setPhoto(null);
      await charger();
      Alert.alert('GoShip Express', t('pa.envoyee'));
    } catch (e) {
      Alert.alert('GoShip Express', (e && e.message) || t('gen.erreur'));
    } finally {
      setOccupe(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <View style={[styles.entete, { paddingTop: marges.top + 16 }]}>
        <View style={styles.halo} pointerEvents="none" />
        <Titre taille={21} couleur="#ffffff">{t('pa.titre')}</Titre>
        <Texte taille={12.5} style={{ marginTop: 12, color: couleurs.surNuit, lineHeight: 19 }}>{t('pa.intro')}</Texte>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 36, gap: 13 }} keyboardShouldPersistTaps="handled">
        <Champ etiquette={t('pa.magasin')} value={magasin} onChangeText={setMagasin} placeholder="Amazon" />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -4 }}>
          {MAGASINS.map((m) => (
            <Pressable key={m} onPress={() => setMagasin(m)} accessibilityRole="button" style={styles.suggestion}>
              <Texte gras taille={12.5} doux>{m}</Texte>
            </Pressable>
          ))}
        </View>

        <Champ etiquette={t('pa.contenu')} value={description} onChangeText={setDescription} placeholder="…" />

        <View style={{ gap: 7 }}>
          <Etiquette>{t('pa.suivi')}</Etiquette>
          <View style={{ flexDirection: 'row', gap: 9 }}>
            <Champ
              value={suivi}
              onChangeText={setSuivi}
              placeholder="TBA123456789000"
              autoCapitalize="characters"
              style={{ flex: 1 }}
            />
            <Pressable
              onPress={() => router.push('/scanner')}
              style={[styles.scan, ombres.bouton]}
              accessibilityRole="button"
              accessibilityLabel={t('pa.scanner')}
            >
              <Feather name="maximize" size={22} color="#ffffff" />
            </Pressable>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Champ etiquette={t('pa.valeur')} value={valeur} onChangeText={setValeur} keyboardType="decimal-pad" style={{ flex: 1 }} />
          <View style={{ flex: 1, gap: 7 }}>
            <Etiquette>{t('de.service')}</Etiquette>
            <View style={styles.segments}>
              {['aerien', 'maritime'].map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setService(s)}
                  accessibilityRole="button"
                  style={[styles.segment, service === s && styles.segmentActif]}
                >
                  <Texte gras taille={13} style={{ color: service === s ? couleurs.texte : couleurs.texteDoux }}>
                    {t('service.' + s)}
                  </Texte>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <Pressable onPress={choisirPhoto} style={styles.photo} accessibilityRole="button">
          <View style={styles.photoRond}>
            <Feather name={photo ? 'check' : 'camera'} size={20} color={couleurs.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Texte gras taille={14}>{photo ? photo.fileName || 'photo.jpg' : t('pa.photo')}</Texte>
            <Texte doux taille={12} style={{ marginTop: 2 }}>{t('pa.photo_texte')}</Texte>
          </View>
        </Pressable>

        <Bouton titre={t('pa.envoyer')} icone="check" onPress={envoyer} occupe={occupe} style={{ marginTop: 4 }} />

        {liste.length > 0 ? (
          <View style={{ marginTop: 14, gap: 11 }}>
            <Titre taille={16}>{t('pa.mes_prealertes')}</Titre>
            {liste.map((p) => (
              <View key={p.id} style={[styles.carte, ombres.carte]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <Texte gras taille={14}>{p.magasin}</Texte>
                  <Pressable
                    onPress={() => supprimerPrealerte(p.id).then(charger).catch(() => {})}
                    accessibilityRole="button"
                    accessibilityLabel={t('gen.annuler')}
                    hitSlop={10}
                  >
                    <Feather name="trash-2" size={17} color={couleurs.texteFaible} />
                  </Pressable>
                </View>
                <Texte doux taille={12.5} style={{ marginTop: 3 }}>{p.description}</Texte>
                {p.suivi_transporteur ? <Mono taille={11.5} couleur={couleurs.texteFaible} style={{ marginTop: 5 }}>{p.suivi_transporteur}</Mono> : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 9 }}>
                  <Texte taille={11.5} doux>{dateCourte(p.cree_le, langue)}</Texte>
                  <Texte gras taille={11.5} style={{ color: p.statut === 'recu' ? couleurs.vert : couleurs.accent }}>
                    {p.statut === 'recu' ? t('pa.associee') : t('pa.attente')}
                    {p.valeur_usd ? ` · ${montant(p.valeur_usd, langue)}` : ''}
                  </Texte>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  entete: {
    backgroundColor: couleurs.nuit,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  halo: { position: 'absolute', top: -80, right: -50, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(244,96,13,0.18)' },
  suggestion: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: rayons.pastille, backgroundColor: '#eaeff8' },
  scan: { width: 54, height: 54, borderRadius: rayons.champ, backgroundColor: couleurs.accent, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' },
  segments: { flexDirection: 'row', height: 54, padding: 5, borderRadius: rayons.champ, backgroundColor: '#e9eef7' },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
  segmentActif: { backgroundColor: couleurs.carte },
  photo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 15,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#c9d4ea',
    backgroundColor: couleurs.carte,
  },
  photoRond: { width: 42, height: 42, borderRadius: 14, backgroundColor: couleurs.accentDoux, alignItems: 'center', justifyContent: 'center' },
  carte: { backgroundColor: couleurs.carte, borderRadius: 18, borderWidth: 1, borderColor: couleurs.bord, padding: 14 },
});
