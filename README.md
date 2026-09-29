# GoShip Express — application mobile (Android, iOS)

L'espace client de GoShip Express sur téléphone : adresse de réception à Miami, colis et
leurs étapes, suivi, pré-alertes, factures, paiements et solde, agences, compte.

C'est **un client de la plateforme**, pas une copie : mêmes comptes, mêmes permissions,
même base Supabase, mêmes règles que le site (dépôt `Goship-express-site`) et que
l'application de bureau. Aucune règle métier ne vit ici : prix, statuts, événements,
soldes, doublons et permissions sont décidés par la base.

```
Utilisateur → Authentification (Supabase) → Permissions (base, RLS) → API (PostgREST) → Données
Colis       → événements (colis_historique) → statut → historique → notification → téléphone
Facture     → paiements (enregistrés par l'équipe) → solde (calculé par la base) → téléphone
```

## Sommaire

1. [Architecture](#architecture)
2. [Installer et développer](#installer-et-développer)
3. [Environnements et variables](#environnements-et-variables)
4. [Ce que l'application lit et écrit](#ce-que-lapplication-lit-et-écrit)
5. [Authentification et session](#authentification-et-session)
6. [Permissions et comptes de l'équipe](#permissions-et-comptes-de-léquipe)
7. [Scanner](#scanner)
8. [Notifications](#notifications)
9. [Liens profonds](#liens-profonds)
10. [Réseau, erreurs, hors ligne](#réseau-erreurs-hors-ligne)
11. [Permissions du téléphone](#permissions-du-téléphone)
12. [Essais](#essais)
13. [Construire : Android et iOS](#construire--android-et-ios)
14. [Publier, mettre à jour, revenir en arrière](#publier-mettre-à-jour-revenir-en-arrière)
15. [Données personnelles](#données-personnelles)
16. [Ce qui manque avant la publication](#ce-qui-manque-avant-la-publication)
17. [Dépannage](#dépannage)

## Architecture

Expo SDK 57, React Native 0.86 (nouvelle architecture, Hermes), expo-router (navigation
par fichiers), supabase-js. Pas de Redux ni de Zustand : deux contextes React (langue,
session) et l'état local des écrans. Aucune base locale.

| Dossier / fichier | Rôle |
|---|---|
| `app/_layout.jsx` | Démarrage, polices, aiguillage selon la session, liens après connexion |
| `app/(onglets)/` | Accueil, Mes colis, Pré-alerte (bouton orange), Factures, Compte |
| `app/colis/[id].jsx` | Détail d'un colis et ses étapes (événements réels) |
| `app/facture/[id].jsx` | Une facture : lignes, paiements reçus, total, payé, solde |
| `app/suivi.jsx` | Suivre un numéro : son colis, sinon le suivi public du site |
| `app/scanner.jsx` | Appareil photo : suivi du vendeur (pré-alerte) ou étiquette GoShip |
| `app/paiement.jsx`, `app/agences.jsx`, `app/connexion.jsx`, `app/inscription.jsx` | |
| `lib/api.js` | **Toutes** les requêtes (tables et fonctions de la base) |
| `lib/session.js` | Connexion, inscription, mot de passe oublié, session expirée, permissions |
| `lib/coffre.js` | Session rangée dans le coffre-fort du téléphone (Keychain, Keystore) |
| `lib/supabase.js` | Client Supabase, délai maximal de 20 s par requête |
| `lib/erreurs.js` | Classe les erreurs (réseau, délai, session, refus, métier…), journal sans secret |
| `lib/useDonnees.js` | Chargement d'un écran : chargement, erreur, données périmées, session |
| `lib/validation.js` | Vérifications de la pré-alerte avant l'envoi (la base revérifie) |
| `lib/scan-parser.js` | **Copie à l'identique** du lecteur de codes du site (`assets/js/scan-parser.js`) |
| `lib/notifications.js` | Jeton du téléphone, état réel des notifications, ouverture d'une notification |
| `lib/i18n.js` | Textes en français, anglais, espagnol et créole (tous les écrans) |
| `config.js` | Adresse de la base (par environnement), coordonnées, moyens de paiement, agences |
| `essais/` | Essais : logique, navigateur, parcours natifs Maestro, contrôle des paquets |

## Installer et développer

Node.js 22.

```bash
npm install
npx expo start          # QR code pour Expo Go (Android, iPhone), ou « Voir l'application.command »
npx expo start --web    # aperçu dans le navigateur (demarrer-web.sh)
```

Attention : en développement, l'application parle à la **vraie base** (environnement
`production`, par défaut), comme l'espace client du site. Utilisez un compte de test.
Pour travailler sur une base jetable, voir [Essais](#essais).

Expo Go ne reçoit pas les notifications (depuis le SDK 53) : il faut une vraie
application construite (build de développement ou de préversion).

## Environnements et variables

| Variable (au moment du build) | Valeurs | Effet |
|---|---|---|
| `EXPO_PUBLIC_GOSHIP_ENV` | `production` (défaut), `essai` | Quelle base |
| `EXPO_PUBLIC_SUPABASE_URL` | ex. `http://localhost:54321` | Adresse de la base d'**essai** seulement |

- `production` : `https://gpfdyslysqjmojgzggib.supabase.co` et la clé **publiable**
  (`sb_publishable_…`). Elle est faite pour être publique : elle ne donne que ce que les
  règles de sécurité (RLS) autorisent, exactement comme sur le site.
- `essai` : la base jetable des essais automatiques. Son adresse n'entre **jamais** dans
  l'application de production (`essais/controle-paquet.mjs` le vérifie à chaque build).
- **Il n'existe pas de base de préproduction.** Le profil `preview` d'`eas.json` utilise
  la production. Pour en créer une : un second projet Supabase, les migrations du site
  dans l'ordre, un environnement `preproduction` dans `config.js` et `eas.json`.

**Jamais dans ce dépôt ni dans l'application** : clé `service_role` ou `sb_secret_…`,
mot de passe, clé PayPal/Azul, clé d'e-mail ou de WhatsApp, identifiants d'administrateur.
Ces secrets restent dans Supabase (Vault) ; `npm run essai` fouille le dépôt.

Toujours construire avec `--clear` (les scripts npm le font) : Metro garde le code
compilé en cache, et un build sans `--clear` a déjà embarqué l'environnement du build
précédent.

## Ce que l'application lit et écrit

Tout passe par `lib/api.js`, avec la session du client. Les règles de sécurité de la
base s'appliquent à chaque requête ; en plus, l'application filtre toujours sur son
propre compte (`client_id`).

| Écran | Source (dans la base) |
|---|---|
| Accueil (chiffres, solde, messages) | `mon_resume()` — la même fonction que l'espace client du site |
| Mes colis | table `colis` : pages de 20, filtres et recherche faits par la base |
| Détail, étapes | `colis` + `colis_historique` (étapes publiques ; une étape corrigée disparaît) |
| Suivi d'un numéro | son colis, sinon `suivre_colis()` (suivi public du site) |
| Pré-alerte | `creer_prealerte()` (validation, doublons, clé d'envoi) ; liste : table `prealertes` |
| Factures, paiements, solde | `mes_factures()` (total, payé, solde, état, lignes, paiements) et `mon_resume()` |
| Rôle | `mes_permissions()` (affichage seulement) |
| Téléphone | `enregistrer_appareil()` ; à la déconnexion, suppression de son jeton |
| Supprimer mon compte (Compte) | `supprimer_mon_compte('SUPPRIMER')` : la base vide le profil, bloque la connexion, ferme les sessions ; refusé tant qu'un colis n'est pas livré ou qu'une facture reste à payer |

Statuts : les huit statuts officiels du site (`recu`, `emballe`, `embarque`,
`distribution`, `succursale`, `disponible`, `livre`, `incident`), rien d'autre. Un
numéro GoShip (`GSE-1001-HT`) désigne le même colis sur le site, le bureau et le téléphone.

La base doit avoir reçu `outils/supabase-mobile.sql` (dépôt du site). Sans lui, la
pré-alerte passe encore par l'ancien chemin (insert direct), sans ses garanties.
« Supprimer mon compte » demande `outils/supabase-compte.sql` (le dernier de la chaîne) :
sans lui, l'application le dit (« pas encore disponible ») et propose WhatsApp.

## Authentification et session

Connexion, inscription, mot de passe oublié (le lien ouvre la page
`nouveau-mot-de-passe.html` du site), déconnexion : Supabase Auth, les mêmes comptes que
le site. La session (jetons) est rangée dans le **coffre-fort du téléphone**
(`expo-secure-store` : Keychain sur iPhone, Keystore sur Android), jamais le mot de
passe. Elle se renouvelle seule ; si le serveur la refuse et qu'elle ne peut pas être
renouvelée, l'application revient à la connexion avec « Votre session a expiré ».
Après une déconnexion, aucun écran privé ne reste accessible (même avec « retour »).

**Continuer avec Google** (écrans *Connexion* et *Inscription*) : le navigateur du
téléphone s'ouvre sur Google (`expo-web-browser`, `signInWithOAuth`), puis Google rend la
main à l'application par `goshipexpress://connexion` ; la session s'ouvre avec les jetons
reçus (`lib/session.js`, `connexionAvec`). Le bouton n'apparaît que si Supabase a activé
Google (réglages publics `/auth/v1/settings`, `lib/connexion-sociale.js`), et jamais dans
la version navigateur (elle ne sert qu'aux essais). Réglages à faire une fois : guide
« Continuer avec Google » du README du site (client OAuth Google, fournisseur dans
Supabase, `goshipexpress://**` dans *Authentication > URL Configuration > Redirect URLs*,
migration `outils/supabase-connexion.sql`). Un compte Google n'a ni pays, ni ville, ni
téléphone : l'accueil propose « Complétez votre profil », qui ouvre *Mes informations*
(`app/profil.jsx`, aussi atteint depuis *Compte > Mes informations > Modifier*).

## Permissions et comptes de l'équipe

L'application est l'**espace client**. Les permissions sont celles de la Phase 6 (base) :
un client ne lit que ses colis, factures, paiements, pré-alertes, profil (vérifié par
`essai-mobile.py` et `essai-web.mjs`, y compris par des appels directs à l'API).
Aucune règle ne teste un nom de rôle dans l'application.

Un compte de l'équipe (employé, gérant, administrateur) peut se connecter : il voit
*ses* colis (aucun, en général) et un avertissement « cette application est l'espace
client ». Le tableau de bord de l'équipe est sur le site et dans l'application de bureau.

## Scanner

L'appareil photo lit : le **suivi du vendeur** (carton, bon de commande) pour remplir une
pré-alerte ; une **étiquette GoShip** (Code128 = numéro, QR = lien
`index.html?suivi=…`) ou un suivi de vendeur pour retrouver un colis. La lecture est celle
du poste de scan du site (`lib/scan-parser.js`, copie identique). Ce n'est pas le poste
de scan de l'équipe : rien ici ne change le statut d'un colis. Les étiquettes ne changent
pas.

Permission refusée : explication et bouton « Autoriser » ; refusée définitivement :
bouton « Ouvrir les réglages » ; caméra indisponible : message. Le même code lu plusieurs
fois de suite n'est traité qu'une fois.

## Notifications

La base envoie elle-même les notifications à chaque changement de statut d'un colis
(`pousser_colis`, service d'Expo), avec l'identifiant du colis. L'application enregistre le
jeton du téléphone après la connexion, le renouvelle s'il change, et le détache à la
déconnexion. Toucher une notification ouvre le colis (application fermée, en arrière-plan
ou ouverte).

**Pour qu'une notification arrive vraiment, il manque encore** :

1. un projet EAS : fait, `extra.eas.projectId` dans `app.json` (projet créé sur expo.dev) ;
2. Android : un projet Firebase et sa clé FCM v1, déposée chez Expo (`eas credentials`) ;
3. iOS : une clé APNs (compte Apple Developer), gérée par `eas credentials` ;
4. un vrai téléphone (un simulateur ne reçoit rien).

Tant que ce n'est pas fait, l'écran Compte dit « Pas encore en service » : l'application
n'annonce jamais des notifications qui ne peuvent pas arriver. États affichés : activées,
refusées (réglages), indisponibles (navigateur, simulateur, Expo Go), pas encore en
service, momentanément indisponibles.

## Liens profonds

Schéma `goshipexpress://` :

| Lien | Écran |
|---|---|
| `goshipexpress://colis/<id>` | un de ses colis (sinon « introuvable ») |
| `goshipexpress://suivi?numero=GSE-1001-HT` | suivi d'un numéro |
| `goshipexpress://facture/<id>` | une de ses factures |
| `goshipexpress://prealerte`, `…/colis`, `…/factures`, `…/compte`, `…/agences` | onglets |

Sans session, le lien mène à la connexion, puis à son écran. Les liens `https://` du site
(Universal Links, App Links) ne sont **pas** branchés : le site est servi sous
`wilnergraph92.github.io/Goship-express-site/`, et ces liens demandent un fichier à la
racine du domaine (`/.well-known/`), qui n'appartient pas à ce dépôt. À faire le jour où le
site aura son propre domaine.

## Réseau, erreurs, hors ligne

- Chaque requête est abandonnée après 20 s (« le serveur ne répond pas »).
- Les lectures sont réessayées par supabase-js (nombre limité, sur coupure ou 503) ; une
  écriture n'est jamais répétée automatiquement.
- Chaque écran distingue chargement, vide, erreur, accès refusé, introuvable et hors
  ligne. Des données déjà affichées restent à l'écran si la mise à jour échoue, avec
  « Connexion indisponible. Certaines données peuvent ne pas être à jour. »
- Aucune donnée métier n'est gardée sur le téléphone : pas de mode hors ligne, et rien
  n'est annoncé « enregistré » sans la réponse du serveur.
- Jamais « undefined », « null », « Error 500 » ni trace technique à l'écran ; le détail
  technique ne va que dans le journal de développement (`__DEV__`), nettoyé des jetons,
  e-mails et clés.
- Pré-alerte : une **clé d'envoi** accompagne chaque pré-alerte et reste la même pour un
  nouvel essai ; la base ne crée qu'une pré-alerte par clé (double appui, délai dépassé,
  réponse perdue). Un double appui ne part d'ailleurs qu'une fois (verrou).

Pas d'outil de suivi des plantages ni d'analytics : aucun n'existait, et aucun n'a été
ajouté. Les plantages en production se lisent dans la Play Console (Android vitals) et
App Store Connect (Xcode Organizer), sans SDK de plus.

## Permissions du téléphone

| Permission | Pourquoi | |
|---|---|---|
| Appareil photo | scanner un code-barres ou un QR code | demandée à l'ouverture du scanner |
| Notifications | colis reçu, disponible, livré… | demandée après la connexion |
| Internet | la base | |

Refusées et retirées de l'application : micro (enregistrement vidéo d'expo-camera),
superposition d'écran, lecture/écriture du stockage, photos (l'ancienne « photo de
facture » n'était jamais envoyée : retirée), Face ID (aucune biométrie). Ni localisation,
ni contacts. Aucune tâche en arrière-plan. Sauvegarde Android désactivée.
Textes des autorisations iOS en français, anglais et espagnol (`langues/`), rangés sous la clé `ios` : Android ne les reçoit pas (sans valeur par défaut, son lint de publication les refuse).

## Essais

Aucun essai ne touche la vraie base.

| Commande | Ce qu'elle prouve |
|---|---|
| `npm run essai` | lecteur de codes identique au site, validation, erreurs, journal sans secret, 4 langues complètes, configuration, aucun secret dans le dépôt |
| `python3 outils/essais-services/essai-mobile.py` (dépôt du site) | les requêtes exactes de l'application sur un vrai PostgREST : isolation client A / B par l'API directe, visiteur, pré-alertes (validation, doublon, double appui, clé d'envoi), factures et solde, téléphones, 10 000 colis |
| `npm run essai:web` | l'application de bout en bout (navigateur) sur la base d'essai : connexion, liens, accueil, pages, filtres, recherche, étapes, suivi, pré-alerte (double appui, réponse perdue, hors ligne), factures, isolation, hors ligne, panne, lenteur, session expirée, déconnexion, inscription, langue, accessibilité |
| `npm run controle:production` | les paquets Android et iOS de production : vraie base, aucune adresse d'essai, aucun secret |
| `essais/maestro/` (CI) | la **vraie application construite** sur émulateur Android et simulateur iOS : parcours client, session gardée après fermeture, liens profonds, pré-alerte, factures, déconnexion, caméra et notifications refusées |

Base d'essai sur votre machine (PostgREST 12 et `pip install pgserver`) :

```bash
# dans Goship-express-site
python3 outils/essais-services/essai-mobile.py --serveur
# dans ce dépôt
npm run essai:web          # CHROMIUM=/chemin/de/chrome si besoin
```

Comptes d'essai (base jetable uniquement) : `marie@exemple.com` / `marie-essai-1`,
`jean@exemple.com` / `jean-essai-1`, `employe@goship.test` / `employe-essai-1`,
`lea@exemple.com` / `lea-essai-1` (sans colis : `essai:web` la supprime).

GitHub Actions (`.github/workflows/mobile.yml`) lance tout cela à chaque changement et
dépose les APK/AAB et l'application iOS dans l'onglet Actions (« Artifacts »).

## Construire : Android et iOS

Identifiants (ne pas les changer une fois publiés) : `com.goshipexpress.app` (Android et
iOS), schéma `goshipexpress`, nom « GoShip Express ».

Compatibilité (configuration actuelle) : Android 7.0 (API 24) et plus, cible API 36 ;
iOS 15.1 et plus ; iPhone (et iPad en mode iPhone).
Construction iOS : **Xcode 27** (Expo 57.1 ; Xcode 26 refuse `expo-modules-jsi`), d'où `macos-26` en CI.

### Avec EAS (builds des boutiques, signés)

```bash
npm install -g eas-cli
eas login                      # compte Expo de GoShip Express
# eas init : déjà fait, le projet EAS est dans app.json (extra.eas.projectId)
eas build --profile preview --platform android     # APK à installer pour tester
eas build --profile production --platform all      # AAB (Play) et IPA (App Store)
eas submit --profile production --platform all
```

Sans ordinateur, depuis GitHub : **Actions > « Construction EAS » > Run workflow**
(`.github/workflows/eas.yml`), en choisissant la plateforme et le profil. Il faut le
secret `EXPO_TOKEN` du dépôt (jeton d'accès du compte Expo, expo.dev > Account settings >
Access tokens). Le lien du fichier construit s'écrit dans le résumé du run. La première
construction iOS se fait depuis un ordinateur (`eas build -p ios`, connexion Apple) ; les
suivantes peuvent passer par le workflow. Le profil `production` ne se construit que
depuis `main`.

Profils (`eas.json`) : `development` (APK de débogage, simulateur), `preview`
(distribution interne), `production` (boutiques). Tous sur la base de production.
Les numéros de build sont tenus par EAS (`appVersionSource: remote`,
`autoIncrement`) : jamais deux fois le même. La version affichée (`1.0.0`) se change dans
`app.json` (`expo.version`) à chaque version publiée.

Signature : EAS crée et garde la clé Android (keystore) et les certificats Apple. Il faut
le compte Google Play Console (25 $ une fois) et le compte Apple Developer (99 $/an).

### Sans EAS (ce que fait la CI)

```bash
EXPO_PUBLIC_GOSHIP_ENV=production npx expo prebuild --platform android --clean
cd android && ./gradlew :app:assembleRelease :app:bundleRelease
```

Ces APK/AAB sont signés avec la clé de **débogage** du modèle Expo : bons pour essayer,
pas pour le Play Store. L'application iOS de la CI n'est **pas signée** (il faut le compte
Apple) : elle prouve que le projet compile pour iPhone, elle ne s'installe pas.

## Publier, mettre à jour, revenir en arrière

- **Mise à jour** : nouvelle version dans `app.json`, `eas build --profile production`,
  `eas submit`. Pas de mise à jour « à distance » (expo-updates n'est pas installé) :
  chaque changement passe par les boutiques.
- **Base d'abord** : une migration nécessaire à la nouvelle version s'exécute avant de
  publier l'application ; elle doit rester compatible avec la version précédente (les
  migrations du site n'ajoutent jamais rien de destructif ; `supabase-mobile.sql` garde
  l'ancien chemin de la pré-alerte ouvert).
- **Revenir en arrière** : Play Console → arrêter le déploiement progressif (« Halt
  rollout ») ou publier à nouveau le build précédent avec un numéro de build supérieur ;
  App Store Connect → retirer la version de la vente / publier le build précédent. Aucune
  donnée n'est sur le téléphone : rien à migrer.
- Déployer progressivement (Play : 10 %, 50 %, 100 % ; App Store : publication progressive
  sur 7 jours).

## Données personnelles

Traitées par l'application (toutes dans Supabase, jamais ailleurs) : nom, e-mail,
téléphone, pays, ville, adresse de livraison, code client, colis (description, poids,
magasin, suivi, étapes), pré-alertes (magasin, contenu, suivi, valeur), factures et
paiements, jeton de notification du téléphone (et sa plateforme, sa langue), langue.
Sur le téléphone : la session (coffre-fort) et la langue choisie ; rien d'autre.
Transmission : HTTPS vers Supabase ; notifications par le service d'Expo (Apple, Google).
Aucune publicité, aucun suivi, aucune analyse d'usage, aucune localisation, aucun contact.
Suppression : **Compte > Supprimer mon compte**, dans l'application (exigé par l'App
Store et Google Play). La base efface nom, e-mail, téléphone et adresse, bloque la
connexion pour toujours, ferme les sessions, efface les téléphones et les pré-alertes en
attente ; les factures et l'historique des colis restent, sans coordonnées (obligation
comptable). La page « Fermer un compte » du site reste l'adresse web à déclarer aux
boutiques pour une demande faite hors de l'application. Le jeton du téléphone est aussi
effacé à chaque déconnexion. La politique de confidentialité (`confidentialite.html`) doit mentionner le
jeton de notification et la caméra (scan, aucune image gardée) — à vérifier par GoShip
Express. Pour les boutiques : « Data safety » (Play) et « App Privacy » (Apple) à remplir
avec cette liste.

## Ce qui manque avant la publication

- Comptes Google Play Console et Apple Developer ; clés FCM et APNs.
- Essais sur un vrai Android et un vrai iPhone (caméra sur de vrais codes, notifications,
  liens, performances) : la CI n'a qu'un émulateur et un simulateur.
- Contenu : adresses et horaires des agences de Port-au-Prince et Santo Domingo, moyens
  de paiement (banque, Azul, MonCash, NatCash) dans `config.js` ; captures d'écran,
  description, catégorie, adresse de support et politique de confidentialité pour les
  boutiques.
- `outils/supabase-mobile.sql` et `outils/supabase-compte.sql` exécutés dans Supabase.

## Dépannage

| Symptôme | Cause probable |
|---|---|
| L'application de test parle à la vraie base | build sans `--clear` : utilisez les scripts npm ; `essais/controle-paquet.mjs` le détecte |
| « Pas encore en service » (notifications) | build sans projet EAS (`extra.eas.projectId` retiré d'`app.json`) |
| Rien ne s'affiche après la connexion (Expo Go) | vérifiez le réseau ; Expo Go ne gère pas les notifications, c'est normal |
| Pré-alerte : « déjà annoncé » | même numéro de suivi déjà en attente : c'est la base qui refuse le doublon |
| `essai:web` : « Base d'essai absente » | lancez `essai-mobile.py --serveur` dans le dépôt du site |
| Android : « cleartext HTTP not permitted » | seul l'APK d'essai de la CI autorise HTTP vers la base d'essai ; c'est voulu |
