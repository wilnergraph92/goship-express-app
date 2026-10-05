# Publier GoShip Express sur Google Play

Tout ce qu'il faut pour la première publication Android, dans l'ordre de la Play Console.
Les textes à coller sont dans [`fiche.md`](fiche.md), les images dans [`images/`](images/).

## Ce qui est prêt

| Élément | Où | Format exigé par Google |
|---|---|---|
| Fichier de l'application (AAB signé) | construit par EAS, profil `production` (voir « 2. Le fichier ») | Android App Bundle, cible API 36 |
| Icône | `images/icone-512.png` | 512 × 512, PNG 32 bits, ≤ 1 Mo |
| Bannière (« feature graphic ») | `images/banniere-fr.png`, `-en`, `-es` | 1024 × 500, PNG sans transparence |
| Captures de téléphone (6 par langue) | `images/telephone-fr-*.png`, `-en-`, `-es-` | 1080 × 1920 (9:16), PNG sans transparence ; 2 à 8 par langue |
| Nom, descriptions, notes de version | `fiche.md` (fr, en, es, ht) | 30 / 80 / 4 000 / 500 caractères, vérifiés par `boutique/outils/longueurs.py` |
| Politique de confidentialité | page du site, section « Application mobile » | URL publique |
| Suppression du compte | dans l'application (Compte > Supprimer mon compte) et page « Fermer un compte » du site | URL publique |

Les captures sont celles de la vraie application. Elles ont été prises sur sa version web, avec la
base d'essai et des données de vitrine (Marie-Ange Dorvil, six colis), jamais avec de vrais
clients. Pour les refaire après un changement d'écran :
1. lancez `essai-mobile.py --serveur` dans le dépôt du site ;
2. chargez `boutique/outils/vitrine.sql` dans cette base d'essai ;
3. lancez `npm run construire:essai` ;
4. lancez `node boutique/outils/captures.mjs`, puis `node boutique/outils/composer.mjs`.

## 0. Avant de commencer : quel type de compte ?

Dans Play Console > **Paramètres** > **Compte de développeur**, regardez le type du compte :

- **Personnel** : Google n'ouvre la publication au public qu'après un **test fermé d'au moins
  12 testeurs pendant 14 jours de suite**. C'est le cas de tous les comptes personnels créés
  depuis novembre 2023. Comptez donc au moins deux semaines entre le premier envoi et la
  publication. Préparez dès maintenant une liste de 12 adresses Gmail : clients fidèles,
  employés, famille. Chacun doit accepter l'invitation et garder l'application installée.
- **Organisation**, avec un numéro D-U-N-S : pas de test imposé, la publication peut se demander
  tout de suite après les tests internes.

## 1. Créer l'application

Play Console > **Créer une application** :

| Champ | Réponse |
|---|---|
| Nom de l'application | `GoShip Express` |
| Langue par défaut | Français (France) – fr-FR |
| Application ou jeu | Application |
| Gratuite ou payante | Gratuite (ce choix ne pourra plus changer) |
| Déclarations | cocher les deux : Règles du programme pour les développeurs, lois américaines sur l'exportation |

Le nom de paquet est fixé par le premier fichier envoyé : **`com.goshipexpress.app`**. Il ne
pourra plus jamais changer.

## 2. Le fichier (AAB)

1. Construction : GitHub > dépôt `goship-express-app` > **Actions** > **Construction EAS** >
   **Run workflow**, branche `main`, plateforme `android`, profil `production`. Le résumé du run
   donne le lien du fichier `.aab`.
   - Comptez 15 à 30 minutes.
   - EAS signe le fichier avec la clé d'envoi qu'il garde pour `com.goshipexpress.app` (expo.dev > Credentials).
   - Le numéro de version (`versionCode`) monte tout seul à chaque construction.
2. Play Console > **Tester et publier** > **Tests** > **Tests internes** > **Créer une version**.
   - **Signature d'application Play** : acceptez. Google garde la clé de signature finale, et
     EAS garde la clé d'envoi.
   - **Importer** le fichier `.aab` téléchargé.
   - Nom de la version : `1.0.0`. Notes de version : celles de `fiche.md`.
   - Enregistrer, puis **Examiner la version**, puis **Lancer le déploiement**.
3. Onglet **Testeurs** : créez une liste avec votre adresse Gmail, puis ouvrez le lien
   d'invitation sur le téléphone. L'application s'installe depuis le Play Store.

Ce premier envoi se fait à la main, parce que Google refuse un premier envoi par l'API. Les
suivants peuvent passer par `eas submit` (voir « 8. Ensuite »).

## 3. Contenu de l'application (Règles et programmes > Contenu de l'application)

Chaque formulaire, avec la réponse qui correspond à ce que fait l'application.

### Règles de confidentialité
URL :
```
https://wilnergraph92.github.io/Goship-express-site/confidentialite.html
```
Après la bascule du domaine, elle devient
`https://goshipexpress.net/confidentialite.html`. Changez-la alors ici. Aucune nouvelle
construction n'est nécessaire.

### Accès à l'application
« **Tout ou partie de la fonctionnalité est restreinte** ». Ajoutez des instructions avec un
**compte d'examen** :
- Nom : `Compte d'examen Google Play`
- Identifiant : l'adresse e-mail du compte d'examen
- Mot de passe : son mot de passe
- Autres informations : `Connectez-vous avec l'adresse e-mail et le mot de passe. L'accueil
  montre l'adresse à Miami et les colis en cours ; Mes colis, Factures et Compte > Historicité
  montrent les autres fonctions.`

À préparer par GoShip Express, sur la vraie base :
1. Créez le compte dans l'application (Créer un compte), avec une adresse e-mail que vous
   contrôlez, par exemple une nouvelle adresse Gmail réservée à cet usage.
2. Ajoutez-lui deux ou trois colis depuis le tableau de bord, à des étapes différentes, pour
   que l'examinateur voie autre chose qu'un écran vide.
3. Ne supprimez pas ce compte tant que l'application est en ligne.

### Annonces
« **Non, mon application ne contient pas d'annonces** ».

### Classification du contenu
- E-mail de contact : `goshipexpressllc@gmail.com`.
- Catégorie : **Tous les autres types d'applications** (pas un jeu).
- Réponses : **Non** à tout : violence, peur, sexualité, langage grossier, substances
  contrôlées, jeux d'argent, achats numériques.
- Interactions : les utilisateurs ne peuvent ni échanger entre eux ni partager du contenu. Le
  lien WhatsApp ouvre une conversation avec GoShip Express, dans WhatsApp. L'application ne
  partage pas la position de l'utilisateur.
- Résultat attendu : **Tout public / PEGI 3**.

### Public cible et contenu
- Tranche d'âge : **18 ans et plus** seulement.
- L'application n'attire pas les enfants : **Non**.

### Applications d'actualités
**Non**.

### Identifiant publicitaire
**Non**, l'application n'utilise pas l'identifiant publicitaire. La construction `production`
retire même la permission `AD_ID` que Firebase pourrait ajouter (`app.json`, `blockedPermissions`).

### Applications gouvernementales, fonctionnalités financières, santé
- Application gouvernementale : **Non**.
- Fonctionnalités financières : **Aucune**. L'application montre des factures de transport ; le
  paiement se fait sur le site de PayPal.
- Santé : **Non**.

### Sécurité des données

Questions générales :

| Question | Réponse |
|---|---|
| Collectez-vous ou partagez-vous des données requises ? | **Oui** |
| Toutes les données sont-elles chiffrées en transit ? | **Oui** (HTTPS vers Supabase) |
| Comment demander la suppression des données ? | **Dans l'application** (Compte > Supprimer mon compte) **et par une URL** : `https://wilnergraph92.github.io/Goship-express-site/fermer-un-compte.html` |
| Les comptes se créent-ils dans l'application ? | **Oui**, par e-mail et mot de passe, ou avec Google |

Données **collectées**. Aucune n'est **partagée** : Supabase et Expo sont des prestataires qui
traitent les données pour GoShip Express, et Google ne compte pas cela comme un partage. Aucune
n'est traitée de façon éphémère. Toutes sont **obligatoires**.

| Catégorie Google | Donnée | Pourquoi |
|---|---|---|
| Informations personnelles > Nom | nom complet | Fonctionnalités de l'appli, Gestion du compte |
| Informations personnelles > Adresse e-mail | e-mail du compte | Fonctionnalités de l'appli, Gestion du compte, Communications du développeur (e-mails sur les colis) |
| Informations personnelles > Identifiants utilisateur | identifiant du compte, code client GSE | Fonctionnalités de l'appli, Gestion du compte |
| Informations personnelles > Adresse | pays, ville, adresse de livraison | Fonctionnalités de l'appli |
| Informations personnelles > Numéro de téléphone | téléphone | Fonctionnalités de l'appli, Communications du développeur (WhatsApp) |
| Informations financières > Historique des achats | colis, pré-alertes (magasin, contenu, valeur), factures et paiements | Fonctionnalités de l'appli |
| Appareil ou autres identifiants | identifiant de notification du téléphone | Fonctionnalités de l'appli (notifications) |

Données **non collectées** : position, contacts, photos et vidéos (l'appareil photo lit un
code-barres sans rien garder), audio, fichiers, agenda, santé, messages, navigation web,
activité dans l'appli, informations de plantage, et l'identifiant publicitaire.

### Suppression du compte (URL demandée par Google)
```
https://wilnergraph92.github.io/Goship-express-site/fermer-un-compte.html
```
Après la bascule : `https://goshipexpress.net/fermer-un-compte.html`.

## 4. Fiche principale (Développer sa présence > Fiche principale du Play Store)

- **Textes** : [`fiche.md`](fiche.md). Le français est la langue par défaut. Ajoutez l'anglais
  et l'espagnol dans « Gérer les traductions », puis le créole haïtien si la liste le propose.
- **Icône** : `images/icone-512.png`.
- **Bannière** : `images/banniere-fr.png`, et `-en`, `-es` dans les traductions.
- **Captures de téléphone** : `images/telephone-fr-01-accueil.png` à `-06-historicite.png`,
  dans cet ordre, et la même chose en `-en-` et `-es-` pour les traductions.
- Captures de tablette : facultatives, aucune n'est fournie. L'application est faite pour le
  téléphone, en mode portrait.

**Paramètres de la fiche** (Paramètres du Play Store) :

| Champ | Réponse |
|---|---|
| Catégorie | **Shopping**. Les clients achètent aux États-Unis et GoShip Express leur livre. **Affaires** convient aussi. |
| Tags | Livraison de colis, Suivi de colis, si la Console les propose |
| E-mail | `goshipexpressllc@gmail.com` |
| Téléphone | `+1 849 538 6262` |
| Site web | `https://wilnergraph92.github.io/Goship-express-site/`, puis `https://goshipexpress.net/` après la bascule |

## 5. Pays et prix

**Tester et publier** > **Production** > **Pays/régions** :
- Haïti, République dominicaine et États-Unis au minimum ;
- ajoutez le Canada et la France si vous y avez des clients.

L'application est gratuite. Elle ne contient aucun achat intégré.

## 6. Test fermé (compte personnel : 12 testeurs, 14 jours)

1. **Tests** > **Test fermé** > **Créer un canal**, nommé par exemple `Clients pilotes`.
2. **Testeurs** : une liste d'au moins 12 adresses Gmail.
3. **Créer une version** > **Ajouter depuis la bibliothèque** : reprenez l'AAB des tests
   internes, sans le reconstruire. Puis envoyez-la en examen. La première fois, l'examen de
   Google prend quelques heures à quelques jours.
4. Envoyez le lien d'invitation aux testeurs. Chacun l'accepte, installe l'application et la
   garde 14 jours.
5. Après 14 jours : **Tableau de bord** > **Demander l'accès à la production**. Google pose
   quelques questions sur le test ; répondez avec ce que les testeurs ont rapporté.

## 7. Publication

**Production** > **Créer une version**, avec le même AAB ou un plus récent.

Choisissez le **déploiement progressif** :
- commencez à 20 % ;
- passez à 50 %, puis à 100 % si rien ne remonte dans **Qualité** > **Android vitals**.

L'examen de Google prend en général de quelques heures à 7 jours.

## 8. Ensuite : mettre à jour l'application des clients

- **Un écran, un texte ou une correction (JavaScript)** : après l'avoir essayé sur l'APK
  `preview`, publiez-le pour les téléphones Google Play :
  1. GitHub > **Actions** > **Mise à jour de l'application** > **Run workflow** ;
  2. branche `main`, canal **production**.

  Les téléphones le reçoivent à la réouverture de l'application. Rien ne passe par Google.
- **Un changement natif** (module, permission, icône, version d'Expo) :
  1. augmentez `version` dans `app.json` (1.0.0 → 1.0.1) ;
  2. construisez avec le profil `production` ;
  3. envoyez le nouvel AAB dans la Play Console, ou avec `eas submit -p android --latest`.
- **`eas submit` automatique** (facultatif) : il demande un compte de service Google Cloud,
  relié dans Play Console > **Configuration** > **Accès à l'API**, et sa clé JSON posée chez
  Expo (expo.dev > Credentials > Android > Google Service Account Key). La clé ne se met jamais
  dans le dépôt. `eas.json` envoie sur la piste des tests internes, en brouillon : la
  publication reste un geste fait dans la Console.

## À compléter avant la production

- **Adresses et horaires des agences** de Port-au-Prince et de Santo Domingo, et **moyens de
  paiement** autres que PayPal (banque, Azul, MonCash, NatCash), dans `config.js`. Pour
  l'instant, l'application les affiche « à compléter ». Un examinateur peut juger
  l'application inachevée.
- **Relire la section « Application mobile »** de la politique de confidentialité : c'est un
  texte juridique de GoShip Express.
- Tester sur un vrai téléphone la version installée depuis le Play Store : connexion,
  notifications, scan d'un code-barres, Google.
- Après la bascule du domaine goshipexpress.net, mettre à jour dans la Console les adresses de
  la politique de confidentialité, de la suppression du compte et du site web.
