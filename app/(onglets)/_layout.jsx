// Barre d'onglets : Accueil, Mes colis, bouton orange (pré-alerte), Factures, Compte.

import { View, Pressable, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { couleurs, polices, ombres } from '../../lib/theme';
import { Texte } from '../../components/ui';
import config from '../../config';
import { useLangue } from '../../lib/i18n';

const ONGLETS = {
  index: { icone: 'home', cle: 'nav.accueil' },
  colis: { icone: 'package', cle: 'nav.colis' },
  prealerte: { icone: 'plus', central: true, cle: 'pa.titre' },
  factures: { icone: 'file-text', cle: 'nav.factures' },
  compte: { icone: 'user', cle: 'nav.compte' },
};

const NOMS = {
  'nav.accueil': { fr: 'Accueil', en: 'Home', es: 'Inicio', ht: 'Akèy' },
  'nav.colis': { fr: 'Mes colis', en: 'Packages', es: 'Paquetes', ht: 'Koli' },
  'nav.factures': { fr: 'Factures', en: 'Invoices', es: 'Facturas', ht: 'Fakti' },
  'nav.compte': { fr: 'Compte', en: 'Account', es: 'Cuenta', ht: 'Kont' },
};

function BarreOnglets({ state, navigation }) {
  const marges = useSafeAreaInsets();
  const { langue } = useLangue();

  const visibles = state.routes.filter((route) => {
    if (!ONGLETS[route.name]) return false;
    if (route.name === 'factures' && !config.modules.factures) return false;
    return true;
  });
  const central = visibles.find((r) => ONGLETS[r.name].central);
  const gauche = visibles.slice(0, visibles.indexOf(central));
  const droite = visibles.slice(visibles.indexOf(central) + 1);

  const onglet = (route) => {
    const reglage = ONGLETS[route.name];
    const actif = state.routes[state.index].key === route.key;
    const aller = () => {
      const evenement = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!actif && !evenement.defaultPrevented) navigation.navigate(route.name);
    };
    const nom = NOMS[reglage.cle][langue] || NOMS[reglage.cle].fr;
    return (
      <Pressable
        key={route.key}
        onPress={aller}
        accessibilityRole="tab"
        accessibilityState={{ selected: actif }}
        style={styles.onglet}
      >
        <Feather name={reglage.icone} size={22} color={actif ? couleurs.accent : couleurs.texteFaible} />
        <Texte
          taille={11}
          style={{
            fontFamily: actif ? polices.corpsTresGras : polices.corpsGras,
            color: actif ? couleurs.accent : couleurs.texteFaible,
          }}
          numberOfLines={1}
        >
          {nom}
        </Texte>
      </Pressable>
    );
  };

  return (
    <View style={[styles.barre, { paddingBottom: Math.max(marges.bottom, 10) }]}>
      <View style={styles.groupe}>{gauche.map(onglet)}</View>
      {central ? (
        <Pressable
          onPress={() => navigation.navigate(central.name)}
          accessibilityRole="button"
          accessibilityLabel={NOMS['nav.colis'][langue]}
          style={[styles.central, ombres.bouton]}
        >
          <Feather name="plus" size={25} color="#ffffff" />
        </Pressable>
      ) : null}
      <View style={styles.groupe}>{droite.map(onglet)}</View>
    </View>
  );
}

export default function Onglets() {
  return (
    <Tabs tabBar={(props) => <BarreOnglets {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="colis" />
      <Tabs.Screen name="prealerte" />
      <Tabs.Screen name="factures" />
      <Tabs.Screen name="compte" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  barre: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: couleurs.carte,
    borderTopWidth: 1,
    borderTopColor: '#e9eef7',
    paddingHorizontal: 16,
    paddingTop: 9,
  },
  groupe: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  onglet: {
    width: 66,
    alignItems: 'center',
    gap: 5,
    paddingTop: 2,
  },
  central: {
    width: 58,
    height: 58,
    marginTop: -22,
    borderRadius: 20,
    backgroundColor: couleurs.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
