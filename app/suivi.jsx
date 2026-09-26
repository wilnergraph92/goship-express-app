// Suivre un colis par son numéro (GSE-…) ou le suivi du vendeur.
//
// Même moteur que le site : si le colis est au client, on ouvre son détail complet
// (lu avec les règles de sécurité de son compte) ; sinon, c'est le suivi public
// (suivre_colis, comme le formulaire « Où est mon colis ? ») — statut et étapes
// publiques seulement, sans nom, description, note ni prix.
// Utilisé par l'accueil, le scanner et les liens goshipexpress://suivi?numero=…

import { useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import EnTete from '../components/EnTete';
import { couleurs, rayons, ombres, STATUTS } from '../lib/theme';
import { Titre, Texte, Mono, Chargement, EtatErreur, Vide } from '../components/ui';
import { FriseLegendee } from '../components/colis';
import { useLangue } from '../lib/i18n';
import { useDonnees } from '../lib/useDonnees';
import { trouverMonColis, suivreColis } from '../lib/api';
import { dateRelative, libelleStatut, libelleService } from '../lib/format';

export default function Suivi() {
  const { numero } = useLocalSearchParams();
  const { t, langue } = useLangue();
  const reference = String(numero || '').trim().slice(0, 80);

  const { donnees, erreur, recharger, chargement } = useDonnees(async () => {
    if (reference.length < 4) return { introuvable: true };
    const mien = await trouverMonColis(reference);
    if (mien) return { mien };
    const publique = await suivreColis(reference);
    return publique ? { publique } : { introuvable: true };
  }, [reference]);

  useEffect(() => {
    if (donnees && donnees.mien) router.replace('/colis/' + donnees.mien.id);
  }, [donnees]);

  const p = donnees && donnees.publique;
  const s = p ? (STATUTS[p.statut] || STATUTS.recu) : null;

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <EnTete titre={t('su.titre')} retour arrondi={false} bas={18} />
      {chargement || (donnees && donnees.mien) ? (
        <Chargement />
      ) : !donnees ? (
        <EtatErreur erreur={erreur} onReessayer={recharger} />
      ) : donnees.introuvable ? (
        <View testID="suivi-introuvable">
          <Vide icone="search" titre={reference || '—'} texte={t('su.introuvable')} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 18, gap: 14, paddingBottom: 40 }} testID="suivi-public">
          <View style={[styles.carte, ombres.carte]}>
            <Mono taille={14}>{p.numero}</Mono>
            <Titre taille={20} style={{ marginTop: 8, color: s.couleur }}>{libelleStatut(p.statut, langue)}</Titre>
            <Texte doux taille={12.5} style={{ marginTop: 3 }}>
              {[libelleService(p.service, langue), dateRelative(p.maj_le, langue)].filter(Boolean).join(' · ')}
            </Texte>
            <View style={{ marginTop: 14 }}>
              <FriseLegendee statut={p.statut} historique={p.historique} />
            </View>
          </View>
          <View style={[styles.carte, ombres.carte]}>
            <Titre taille={15.5} style={{ marginBottom: 10 }}>{t('de.etapes')}</Titre>
            {p.historique.length === 0 ? <Texte doux>{t('de.aucune_etape')}</Texte> : p.historique.slice().reverse().map((h, i) => (
              <View key={i} style={{ paddingVertical: 7, borderBottomWidth: i < p.historique.length - 1 ? 1 : 0, borderBottomColor: '#f1f4fa' }}>
                <Texte gras taille={14}>{libelleStatut(h.statut, langue)}</Texte>
                <Texte doux taille={12.5}>{[dateRelative(h.cree_le, langue), h.lieu].filter(Boolean).join(' · ')}</Texte>
              </View>
            ))}
          </View>
          <Texte doux taille={12.5} style={{ textAlign: 'center', lineHeight: 19 }}>{t('su.public')}</Texte>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  carte: { backgroundColor: couleurs.carte, borderRadius: rayons.carte, borderWidth: 1, borderColor: couleurs.bord, padding: 17 },
});
