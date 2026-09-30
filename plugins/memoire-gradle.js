// Mémoire de Gradle pour la construction Android.
//
// Le projet Android généré par « expo prebuild » laisse 512 Mo de Metaspace à
// Gradle. Avec expo-updates (mises à jour sans nouvelle construction), le nombre
// de modules natifs à compiler augmente et Gradle s'arrête sur
// « OutOfMemoryError: Metaspace » — la construction tourne alors jusqu'au délai
// maximal sans rien produire. Le réglage est posé ici plutôt que dans le
// workflow : les constructions sur expo.dev (eas build) passent par le même
// prebuild et en ont autant besoin.
const { withGradleProperties } = require('expo/config-plugins');

const ARGS_JVM = '-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8';

module.exports = function memoireGradle(config) {
  return withGradleProperties(config, (config) => {
    const proprietes = config.modResults.filter(
      (p) => !(p.type === 'property' && p.key === 'org.gradle.jvmargs')
    );
    proprietes.push({ type: 'property', key: 'org.gradle.jvmargs', value: ARGS_JVM });
    config.modResults = proprietes;
    return config;
  });
};
