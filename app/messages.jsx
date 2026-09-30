// Les derniers messages envoyés au client (e-mail, WhatsApp, notification), ouverts par
// la cloche de l'accueil. Ils viennent de mon_resume (messages_recents, dix au plus),
// comme le bloc « Derniers messages » qu'avait l'accueil : l'application n'envoie ni ne
// compte rien. Tirer l'écran vers le bas le recharge.

import { useEffect } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import EnTete from '../components/EnTete';
import { couleurs, ombres } from '../lib/theme';
import { Texte, Chargement, Vide, EtatErreur, Bandeau } from '../components/ui';
import { useLangue } from '../lib/i18n';
import { useSession } from '../lib/session';
import { useDonnees } from '../lib/useDonnees';
import { monResume, surveiller } from '../lib/api';
import { dateRelative, libelleStatut } from '../lib/format';

const STATUTS_CONNUS = ['recu', 'emballe', 'embarque', 'distribution', 'succursale', 'disponible', 'livre', 'incident'];

export default function Messages() {
  const { t, langue } = useLangue();
  const { profil } = useSession();

  const { donnees: messages, erreur, recharger, rafraichit, tirer, chargement } = useDonnees(async () => {
    const resume = await monResume();
    return resume?.notifications || [];
  }, []);

  useEffect(() => surveiller(profil?.id, recharger), [profil?.id, recharger]);

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <EnTete titre={t('ac.messages')} retour arrondi={false} bas={18} />
      {messages ? <Bandeau erreur={erreur} onReessayer={recharger} /> : null}

      {chargement ? (
        <Chargement />
      ) : !messages ? (
        <View style={{ paddingTop: 20 }}><EtatErreur erreur={erreur} onReessayer={recharger} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 18, paddingBottom: 34 }}
          refreshControl={<RefreshControl refreshing={rafraichit} onRefresh={tirer} tintColor={couleurs.accent} />}
        >
          {messages.length === 0 ? (
            <Vide icone="bell" titre={t('msg.vide')} texte={t('msg.vide_texte')} testID="messages-vide" />
          ) : (
            <View style={[styles.carte, ombres.carte]} testID="messages-liste">
              {messages.map((m, i) => (
                <View key={i} style={[styles.message, i < messages.length - 1 && styles.messageBord]} testID="message">
                  <Feather name={m.canal === 'email' ? 'mail' : m.canal === 'whatsapp' ? 'message-circle' : 'bell'}
                    size={16} color={couleurs.texteDoux} />
                  <View style={{ flex: 1 }}>
                    <Texte gras taille={13.5}>
                      {STATUTS_CONNUS.indexOf(m.evenement) >= 0 ? libelleStatut(m.evenement, langue)
                        : m.evenement === 'bienvenue' ? t('msg.bienvenue') : t('msg.autre')}
                    </Texte>
                    <Texte doux taille={12}>
                      {[t('msg.' + m.canal), m.numero, dateRelative(m.envoye_le, langue)].filter(Boolean).join(' · ')}
                    </Texte>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  carte: {
    paddingHorizontal: 15, paddingVertical: 6,
    backgroundColor: couleurs.carte, borderRadius: 18, borderWidth: 1, borderColor: couleurs.bord,
  },
  message: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11 },
  messageBord: { borderBottomWidth: 1, borderBottomColor: '#f1f4fa' },
});
