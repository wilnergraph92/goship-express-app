// Réglages de la construction Android demandés par la Play Console (« Pour votre prochaine version »).
//
// 1. Optimisation du code (R8) : sans elle, la console signale « L'optimisation du code DEX est
//    inférieure à notre seuil » (obscurcissement à 1 %). On réduit et obscurcit le code, et on retire
//    les ressources inutilisées. Le fichier de correspondance (mapping) est joint au bundle par Gradle :
//    la console s'en sert toute seule pour lire les rapports de plantage.
// 2. Affichage de bord à bord : React Native rend lui-même les barres du système transparentes au
//    démarrage (WindowUtil.enableEdgeToEdge). Les deux réglages de thème ci-dessous faisaient double
//    emploi, et Android 15 les déclare obsolètes : on les retire.
const { withGradleProperties, withAndroidStyles } = require('expo/config-plugins');

const PROPRIETES = {
  'android.enableMinifyInReleaseBuilds': 'true',
  'android.enableShrinkResourcesInReleaseBuilds': 'true',
};

const REGLAGES_OBSOLETES = ['android:statusBarColor', 'android:navigationBarColor'];

function reduireLeCode(config) {
  return withGradleProperties(config, (config) => {
    const reste = config.modResults.filter((p) => !(p.type === 'property' && p.key in PROPRIETES));
    for (const cle of Object.keys(PROPRIETES)) reste.push({ type: 'property', key: cle, value: PROPRIETES[cle] });
    config.modResults = reste;
    return config;
  });
}

function retirerReglagesObsoletes(config) {
  return withAndroidStyles(config, (config) => {
    for (const style of config.modResults.resources.style || []) {
      if (style.$.name !== 'AppTheme' || !Array.isArray(style.item)) continue;
      style.item = style.item.filter((i) => !REGLAGES_OBSOLETES.includes(i.$.name));
    }
    return config;
  });
}

module.exports = function optimisationAndroid(config) {
  return retirerReglagesObsoletes(reduireLeCode(config));
};
