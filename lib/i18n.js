// Textes de l'application dans les quatre langues du site.
// Les traductions des statuts et des services reprennent exactement celles du site.

import { createContext, useContext, useMemo, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';

export const LANGUES = [
  { code: 'fr', nom: 'Français' },
  { code: 'en', nom: 'English' },
  { code: 'es', nom: 'Español' },
  { code: 'ht', nom: 'Kreyòl' },
];

const T = {
  // — Général
  'gen.reessayer': { fr: 'Réessayer', en: 'Try again', es: 'Reintentar', ht: 'Reeseye' },
  'gen.annuler': { fr: 'Annuler', en: 'Cancel', es: 'Cancelar', ht: 'Anile' },
  'gen.fermer': { fr: 'Fermer', en: 'Close', es: 'Cerrar', ht: 'Fèmen' },
  'gen.copier': { fr: 'Copier', en: 'Copy', es: 'Copiar', ht: 'Kopye' },
  'gen.copie': { fr: 'Copié', en: 'Copied', es: 'Copiado', ht: 'Kopye' },
  'gen.partager': { fr: 'Partager', en: 'Share', es: 'Compartir', ht: 'Pataje' },
  'gen.chargement': { fr: 'Chargement…', en: 'Loading…', es: 'Cargando…', ht: 'N ap chaje…' },
  'gen.erreur': { fr: 'Une erreur est survenue.', en: 'Something went wrong.', es: 'Se produjo un error.', ht: 'Gen yon erè ki fèt.' },
  'gen.hors_ligne': { fr: 'Pas de connexion Internet.', en: 'No internet connection.', es: 'Sin conexión a Internet.', ht: 'Pa gen koneksyon entènèt.' },

  // — Connexion
  'cx.titre': { fr: 'Bon retour.', en: 'Welcome back.', es: 'Bienvenido de nuevo.', ht: 'Byenveni ankò.' },
  'cx.sous_titre': {
    fr: 'Vos colis, vos alertes et votre adresse de Miami, dans une seule application.',
    en: 'Your packages, your alerts and your Miami address, in one app.',
    es: 'Sus paquetes, sus alertas y su dirección de Miami, en una sola aplicación.',
    ht: 'Koli ou yo, alèt ou yo ak adrès Miami ou, nan yon sèl aplikasyon.',
  },
  'cx.email': { fr: 'E-mail', en: 'Email', es: 'Correo electrónico', ht: 'Imèl' },
  'cx.motdepasse': { fr: 'Mot de passe', en: 'Password', es: 'Contraseña', ht: 'Modpas' },
  'cx.oublie': { fr: 'Mot de passe oublié ?', en: 'Forgot your password?', es: '¿Olvidó su contraseña?', ht: 'Ou bliye modpas ou?' },
  'cx.connexion': { fr: 'Se connecter', en: 'Sign in', es: 'Iniciar sesión', ht: 'Konekte' },
  'cx.pas_de_compte': { fr: 'Pas encore de compte ?', en: 'No account yet?', es: '¿Aún no tiene cuenta?', ht: 'Ou poko gen kont?' },
  'cx.creer': { fr: 'Créer un compte', en: 'Create account', es: 'Crear cuenta', ht: 'Kreye yon kont' },
  'cx.google': { fr: 'Continuer avec Google', en: 'Continue with Google', es: 'Continuar con Google', ht: 'Kontinye ak Google' },
  'cx.google_annule': {
    fr: 'Connexion avec Google annulée. Réessayez, ou utilisez votre e-mail et votre mot de passe.',
    en: 'Google sign-in cancelled. Try again, or use your email and password.',
    es: 'Inicio de sesión con Google cancelado. Vuelva a intentarlo o use su correo electrónico y su contraseña.',
    ht: 'Koneksyon ak Google anile. Eseye ankò, oswa sèvi ak imèl ou ak modpas ou.',
  },
  'cx.google_echec': {
    fr: "La connexion avec Google n'a pas abouti. Réessayez dans un instant, ou utilisez votre e-mail et votre mot de passe.",
    en: 'Google sign-in did not go through. Try again in a moment, or use your email and password.',
    es: 'El inicio de sesión con Google no se completó. Vuelva a intentarlo en un momento o use su correo electrónico y su contraseña.',
    ht: 'Koneksyon ak Google pa t mache. Eseye ankò nan yon ti moman, oswa sèvi ak imèl ou ak modpas ou.',
  },
  'pf.titre': { fr: 'Mes informations', en: 'My details', es: 'Mis datos', ht: 'Enfòmasyon mwen' },
  'pf.completer_titre': { fr: 'Complétez votre profil', en: 'Complete your profile', es: 'Complete su perfil', ht: 'Konplete pwofil ou' },
  'pf.completer_texte': {
    fr: 'Indiquez votre pays, votre ville et votre téléphone : nous en avons besoin pour vous remettre vos colis et vous prévenir de leur arrivée.',
    en: 'Enter your country, city and phone number: we need them to hand over your packages and let you know when they arrive.',
    es: 'Indique su país, su ciudad y su teléfono: los necesitamos para entregarle sus paquetes y avisarle de su llegada.',
    ht: 'Mete peyi ou, vil ou ak telefòn ou : nou bezwen yo pou n remèt ou koli ou yo epi pou n avèti w lè yo rive.',
  },
  'pf.adresse': { fr: 'Adresse (facultatif)', en: 'Address (optional)', es: 'Dirección (opcional)', ht: 'Adrès (si ou vle)' },
  'pf.enregistrer': { fr: 'Enregistrer', en: 'Save', es: 'Guardar', ht: 'Anrejistre' },
  'cp.modifier': { fr: 'Modifier mes informations', en: 'Edit my details', es: 'Modificar mis datos', ht: 'Modifye enfòmasyon mwen' },
  'cx.echec': {
    fr: 'E-mail ou mot de passe incorrect.',
    en: 'Incorrect email or password.',
    es: 'Correo o contraseña incorrectos.',
    ht: 'Imèl oswa modpas pa kòrèk.',
  },
  'cx.mail_envoye': {
    fr: 'Si un compte existe, un e-mail de réinitialisation vient de partir.',
    en: 'If an account exists, a reset email has just been sent.',
    es: 'Si la cuenta existe, se acaba de enviar un correo de restablecimiento.',
    ht: 'Si kont lan egziste, nou fèk voye yon imèl pou chanje modpas la.',
  },

  // — Inscription
  'in.titre': { fr: 'Créer mon compte', en: 'Create my account', es: 'Crear mi cuenta', ht: 'Kreye kont mwen' },
  'in.sous_titre': {
    fr: 'Vous recevez votre adresse de réception en Floride tout de suite après.',
    en: 'You get your Florida receiving address right after.',
    es: 'Recibirá su dirección de recepción en Florida justo después.',
    ht: 'W ap resevwa adrès resepsyon ou an Florid touswit apre.',
  },
  'in.nom': { fr: 'Nom complet', en: 'Full name', es: 'Nombre completo', ht: 'Non konplè' },
  'in.telephone': { fr: 'Téléphone / WhatsApp', en: 'Phone / WhatsApp', es: 'Teléfono / WhatsApp', ht: 'Telefòn / WhatsApp' },
  'in.pays': { fr: 'Pays de livraison', en: 'Delivery country', es: 'País de entrega', ht: 'Peyi livrezon' },
  'in.ville': { fr: 'Ville', en: 'City', es: 'Ciudad', ht: 'Vil' },
  'in.creer': { fr: 'Créer mon compte', en: 'Create my account', es: 'Crear mi cuenta', ht: 'Kreye kont mwen' },
  'in.deja': { fr: 'J’ai déjà un compte', en: 'I already have an account', es: 'Ya tengo una cuenta', ht: 'Mwen deja gen yon kont' },
  'in.champs': {
    fr: 'Remplissez le nom, l’e-mail et le mot de passe.',
    en: 'Please fill in name, email and password.',
    es: 'Complete el nombre, el correo y la contraseña.',
    ht: 'Ranpli non, imèl ak modpas.',
  },
  'in.mdp_court': {
    fr: 'Choisissez un mot de passe d’au moins 6 caractères.',
    en: 'Choose a password of at least 6 characters.',
    es: 'Elija una contraseña de al menos 6 caracteres.',
    ht: 'Chwazi yon modpas ki gen omwen 6 karaktè.',
  },
  'in.confirmez': {
    fr: 'Votre compte est créé. Ouvrez le lien que nous venons de vous envoyer par e-mail, puis connectez-vous.',
    en: 'Your account is created. Open the link we just emailed you, then sign in.',
    es: 'Su cuenta está creada. Abra el enlace que acabamos de enviarle por correo y luego inicie sesión.',
    ht: 'Kont ou kreye. Louvri lyen nou sot voye nan imèl ou a, apre sa konekte.',
  },

  // — Accueil
  'ac.bonjour': { fr: 'Bonjour', en: 'Hello', es: 'Hola', ht: 'Bonjou' },
  'ac.adresse': { fr: 'Mon adresse à Miami', en: 'My Miami address', es: 'Mi dirección en Miami', ht: 'Adrès mwen nan Miami' },
  'ac.en_route': { fr: 'en cours', en: 'in progress', es: 'en curso', ht: 'an kou' },
  'ac.a_retirer': { fr: 'à retirer', en: 'ready', es: 'para retirar', ht: 'pou pran' },
  'ac.derniers': { fr: 'Derniers mouvements', en: 'Latest updates', es: 'Últimos movimientos', ht: 'Dènye mouvman' },
  'ac.tout_voir': { fr: 'Tout voir', en: 'See all', es: 'Ver todo', ht: 'Wè tout' },
  'ac.prealerte_titre': { fr: 'Annoncer un achat', en: 'Announce a purchase', es: 'Anunciar una compra', ht: 'Anonse yon acha' },
  'ac.prealerte_texte': {
    fr: 'Pré-alerte : votre colis est traité plus vite',
    en: 'Pre-alert: your package is processed faster',
    es: 'Prealerta: su paquete se procesa más rápido',
    ht: 'Pre-alèt: koli ou trete pi vit',
  },

  // — Mes colis
  'co.titre': { fr: 'Mes colis', en: 'My packages', es: 'Mis paquetes', ht: 'Koli mwen yo' },
  'co.recherche': { fr: 'Numéro, contenu ou magasin', en: 'Number, contents or store', es: 'Número, contenido o tienda', ht: 'Nimewo, kontni oswa magazen' },
  'co.tous': { fr: 'Tous', en: 'All', es: 'Todos', ht: 'Tout' },
  'co.en_route': { fr: 'En route', en: 'On the way', es: 'En camino', ht: 'An wout' },
  'co.a_retirer': { fr: 'À retirer', en: 'Ready', es: 'Para retirar', ht: 'Pou pran' },
  'co.livres': { fr: 'Livrés', en: 'Delivered', es: 'Entregados', ht: 'Livre' },
  'co.vide': { fr: 'Aucun colis pour l’instant', en: 'No packages yet', es: 'Aún no hay paquetes', ht: 'Pa gen koli pou kounye a' },
  'co.vide_texte': {
    fr: 'Utilisez votre adresse de Miami pour vos achats : vos colis apparaîtront ici.',
    en: 'Use your Miami address when you shop: your packages will show up here.',
    es: 'Use su dirección de Miami al comprar: sus paquetes aparecerán aquí.',
    ht: 'Sèvi ak adrès Miami ou lè w ap achte: koli ou yo ap parèt isit la.',
  },
  'co.maj': { fr: 'Mis à jour', en: 'Updated', es: 'Actualizado', ht: 'Mete ajou' },

  // — Détail
  'de.etapes': { fr: 'Étapes du colis', en: 'Package steps', es: 'Etapas del paquete', ht: 'Etap koli a' },
  'de.poids': { fr: 'Poids', en: 'Weight', es: 'Peso', ht: 'Pwa' },
  'de.service': { fr: 'Service', en: 'Service', es: 'Servicio', ht: 'Sèvis' },
  'de.magasin': { fr: 'Magasin', en: 'Store', es: 'Tienda', ht: 'Magazen' },
  'de.destination': { fr: 'Destination', en: 'Destination', es: 'Destino', ht: 'Destinasyon' },
  'de.whatsapp': { fr: 'Écrire sur WhatsApp', en: 'Message on WhatsApp', es: 'Escribir por WhatsApp', ht: 'Ekri sou WhatsApp' },
  'de.aucune_etape': { fr: 'Aucune étape enregistrée.', en: 'No steps recorded yet.', es: 'Aún no hay etapas.', ht: 'Poko gen etap anrejistre.' },

  // — Pré-alerte
  'pa.titre': { fr: 'Nouvelle pré-alerte', en: 'New pre-alert', es: 'Nueva prealerta', ht: 'Nouvo pre-alèt' },
  'pa.intro': {
    fr: 'Annoncez votre achat : à son arrivée à Miami, votre colis est reconnu tout de suite.',
    en: 'Announce your purchase: when it lands in Miami, your package is recognised at once.',
    es: 'Anuncie su compra: al llegar a Miami, su paquete se reconoce de inmediato.',
    ht: 'Anonse acha ou: lè li rive Miami, koli a rekonèt touswit.',
  },
  'pa.magasin': { fr: 'Magasin', en: 'Store', es: 'Tienda', ht: 'Magazen' },
  'pa.contenu': { fr: 'Contenu', en: 'Contents', es: 'Contenido', ht: 'Kontni' },
  'pa.contenu_ph': { fr: 'Ex. : chaussures, téléphone', en: 'E.g. shoes, phone', es: 'Ej.: zapatos, teléfono', ht: 'Egz.: soulye, telefòn' },
  'pa.suivi': { fr: 'Numéro de suivi du magasin', en: 'Store tracking number', es: 'Número de seguimiento de la tienda', ht: 'Nimewo swivi magazen an' },
  'pa.scanner': { fr: 'Scanner le code-barres', en: 'Scan the barcode', es: 'Escanear el código de barras', ht: 'Eskane kòd-ba a' },
  'pa.valeur': { fr: 'Valeur (US $)', en: 'Value (US $)', es: 'Valor (US $)', ht: 'Valè (US $)' },
  'pa.envoyer': { fr: 'Envoyer la pré-alerte', en: 'Send the pre-alert', es: 'Enviar la prealerta', ht: 'Voye pre-alèt la' },
  'pa.envoyee': { fr: 'Pré-alerte enregistrée.', en: 'Pre-alert saved.', es: 'Prealerta guardada.', ht: 'Pre-alèt anrejistre.' },
  'pa.requis': {
    fr: 'Indiquez au moins le magasin et le contenu.',
    en: 'Enter at least the store and the contents.',
    es: 'Indique al menos la tienda y el contenido.',
    ht: 'Mete omwen magazen an ak kontni an.',
  },
  'pa.mes_prealertes': { fr: 'Mes pré-alertes', en: 'My pre-alerts', es: 'Mis prealertas', ht: 'Pre-alèt mwen yo' },
  'pa.attente': { fr: 'En attente à Miami', en: 'Awaiting arrival', es: 'Esperando en Miami', ht: 'Ap tann nan Miami' },
  'pa.associee': { fr: 'Colis reçu', en: 'Package received', es: 'Paquete recibido', ht: 'Koli resevwa' },
  'pa.camera_refus': {
    fr: 'L’accès à l’appareil photo est nécessaire pour scanner.',
    en: 'Camera access is needed to scan.',
    es: 'Se necesita acceso a la cámara para escanear.',
    ht: 'Nou bezwen aksè ak kamera a pou eskane.',
  },

  // — Factures
  'fa.titre': { fr: 'Mes factures', en: 'My invoices', es: 'Mis facturas', ht: 'Fakti mwen yo' },
  'fa.solde': { fr: 'Solde à payer', en: 'Balance due', es: 'Saldo a pagar', ht: 'Balans pou peye' },
  'fa.payer': { fr: 'Payer maintenant', en: 'Pay now', es: 'Pagar ahora', ht: 'Peye kounye a' },
  'fa.en_attente': { fr: 'en attente', en: 'pending', es: 'pendientes', ht: 'annatant' },
  'fa.a_payer': { fr: 'À payer', en: 'To pay', es: 'A pagar', ht: 'Pou peye' },
  'fa.payees': { fr: 'Payées', en: 'Paid', es: 'Pagadas', ht: 'Peye' },
  'fa.payee': { fr: 'Payée', en: 'Paid', es: 'Pagada', ht: 'Peye' },
  'fa.vide': { fr: 'Aucune facture', en: 'No invoices', es: 'Sin facturas', ht: 'Pa gen fakti' },
  'fa.moyens': {
    fr: 'Carte bancaire, virement, MonCash, NatCash : voir « Payer maintenant ».',
    en: 'Card, bank transfer, MonCash, NatCash: see “Pay now”.',
    es: 'Tarjeta, transferencia, MonCash, NatCash: vea «Pagar ahora».',
    ht: 'Kat, virman, MonCash, NatCash: gade « Peye kounye a ».',
  },
  'fa.colis': { fr: 'colis', en: 'packages', es: 'paquetes', ht: 'koli' },

  // — Paiement
  'pay.titre': { fr: 'Payer ma facture', en: 'Pay my invoice', es: 'Pagar mi factura', ht: 'Peye fakti mwen' },
  'pay.a_payer': { fr: 'Montant à payer', en: 'Amount due', es: 'Importe a pagar', ht: 'Montan pou peye' },
  'pay.paypal': { fr: 'Payer par carte bancaire', en: 'Pay by card', es: 'Pagar con tarjeta', ht: 'Peye ak kat bankè' },
  'pay.paypal_note': {
    fr: 'Visa ou Mastercard, sur la page sécurisée de PayPal. Aucun compte PayPal nécessaire.',
    en: 'Visa or Mastercard, on PayPal\u2019s secure page. No PayPal account needed.',
    es: 'Visa o Mastercard, en la página segura de PayPal. No hace falta una cuenta PayPal.',
    ht: 'Visa oswa Mastercard, sou paj sekirize PayPal la. Ou pa bezwen kont PayPal.',
  },
  'pay.carte_note': {
    fr: 'Visa ou Mastercard, sur la page sécurisée de la banque.',
    en: 'Visa or Mastercard, on the bank\u2019s secure page.',
    es: 'Visa o Mastercard, en la página segura del banco.',
    ht: 'Visa oswa Mastercard, sou paj sekirize bank lan.',
  },
  'pay.autres': { fr: 'Autres moyens de paiement', en: 'Other payment methods', es: 'Otros medios de pago', ht: 'Lòt mwayen pou peye' },
  'pay.recu': { fr: 'Envoyer mon reçu sur WhatsApp', en: 'Send my receipt on WhatsApp', es: 'Enviar mi recibo por WhatsApp', ht: 'Voye resi mwen sou WhatsApp' },
  'pay.apres': {
    fr: 'Après votre paiement, envoyez-nous le reçu : nous marquons la facture payée et vous recevez une confirmation.',
    en: 'After paying, send us the receipt: we mark the invoice as paid and you get a confirmation.',
    es: 'Después de pagar, envíenos el recibo: marcamos la factura como pagada y recibirá una confirmación.',
    ht: 'Apre ou fin peye, voye resi a ban nou: n ap make fakti a peye epi w ap resevwa yon konfimasyon.',
  },
  'pay.message': {
    fr: 'Bonjour, voici le reçu de ma facture {numero} ({montant}).',
    en: 'Hello, here is the receipt for my invoice {numero} ({montant}).',
    es: 'Hola, aquí está el recibo de mi factura {numero} ({montant}).',
    ht: 'Bonjou, men resi fakti mwen {numero} ({montant}).',
  },
  'pay.indisponible': {
    fr: 'Le lien de paiement n’est pas encore prêt. Utilisez un autre moyen ou écrivez-nous.',
    en: 'The payment link is not ready yet. Use another method or write to us.',
    es: 'El enlace de pago aún no está listo. Use otro medio o escríbanos.',
    ht: 'Lyen pou peye a poko pare. Sèvi ak yon lòt mwayen oswa ekri nou.',
  },
  'pay.a_completer': {
    fr: 'À compléter par Goship Express',
    en: 'To be filled in by Goship Express',
    es: 'Por completar por Goship Express',
    ht: 'Goship Express dwe ranpli sa',
  },

  // — Agences
  'ag.titre': { fr: 'Nos agences', en: 'Our branches', es: 'Nuestras agencias', ht: 'Ajans nou yo' },
  'ag.itineraire': { fr: 'Itinéraire', en: 'Directions', es: 'Cómo llegar', ht: 'Chemen an' },
  'ag.appeler': { fr: 'Appeler', en: 'Call', es: 'Llamar', ht: 'Rele' },

  // — Compte
  'cp.titre': { fr: 'Mon compte', en: 'My account', es: 'Mi cuenta', ht: 'Kont mwen' },
  'cp.code': { fr: 'Mon code client', en: 'My customer code', es: 'Mi código de cliente', ht: 'Kòd kliyan mwen' },
  'cp.infos': { fr: 'Mes informations', en: 'My details', es: 'Mis datos', ht: 'Enfòmasyon mwen' },
  'cp.adresse_livraison': { fr: 'Mon adresse de livraison', en: 'My delivery address', es: 'Mi dirección de entrega', ht: 'Adrès livrezon mwen' },
  'cp.notifications': { fr: 'Notifications', en: 'Notifications', es: 'Notificaciones', ht: 'Notifikasyon' },
  'cp.notifications_texte': {
    fr: 'Colis reçu, disponible, livré',
    en: 'Package received, ready, delivered',
    es: 'Paquete recibido, disponible, entregado',
    ht: 'Koli resevwa, disponib, livre',
  },
  'cp.langue': { fr: 'Langue', en: 'Language', es: 'Idioma', ht: 'Lang' },
  'cp.agences': { fr: 'Nos agences', en: 'Our branches', es: 'Nuestras agencias', ht: 'Ajans nou yo' },
  'cp.aide': { fr: 'Aide et WhatsApp', en: 'Help and WhatsApp', es: 'Ayuda y WhatsApp', ht: 'Èd ak WhatsApp' },
  'cp.deconnexion': { fr: 'Se déconnecter', en: 'Sign out', es: 'Cerrar sesión', ht: 'Dekonekte' },
  'cp.enregistrer': { fr: 'Enregistrer', en: 'Save', es: 'Guardar', ht: 'Anrejistre' },
  'cp.enregistre': { fr: 'Modifications enregistrées.', en: 'Changes saved.', es: 'Cambios guardados.', ht: 'Chanjman anrejistre.' },

  // — Statuts (mêmes textes que le site)
  'statut.recu': { fr: 'Reçu', en: 'Received', es: 'Recibido', ht: 'Resevwa' },
  'statut.emballe': { fr: 'Emballé', en: 'Packed', es: 'Embalado', ht: 'Anbale' },
  'statut.embarque': { fr: 'Embarqué', en: 'Shipped', es: 'Embarcado', ht: 'Anbake' },
  'statut.distribution': { fr: 'Centre de distribution', en: 'Distribution centre', es: 'Centro de distribución', ht: 'Sant distribisyon' },
  'statut.succursale': { fr: 'Transféré à la succursale', en: 'Transferred to the branch', es: 'Transferido a la sucursal', ht: 'Transfere nan sikisal la' },
  'statut.disponible': { fr: 'Disponible', en: 'Ready for pickup', es: 'Disponible', ht: 'Disponib' },
  'statut.livre': { fr: 'Livré', en: 'Delivered', es: 'Entregado', ht: 'Livre' },
  'statut.incident': { fr: 'Action requise', en: 'Action required', es: 'Acción requerida', ht: 'Aksyon nesesè' },

  // — Frise
  'etape.1': { fr: 'Reçu', en: 'Received', es: 'Recibido', ht: 'Resevwa' },
  'etape.2': { fr: 'Emballé', en: 'Packed', es: 'Embalado', ht: 'Anbale' },
  'etape.3': { fr: 'Embarqué', en: 'Shipped', es: 'Embarcado', ht: 'Anbake' },
  'etape.4': { fr: 'Distribution', en: 'Distribution', es: 'Distribución', ht: 'Distribisyon' },
  'etape.5': { fr: 'Succursale', en: 'Branch', es: 'Sucursal', ht: 'Sikisal' },
  'etape.6': { fr: 'Disponible', en: 'Ready', es: 'Disponible', ht: 'Disponib' },
  'etape.7': { fr: 'Livré', en: 'Delivered', es: 'Entregado', ht: 'Livre' },
  'de.etape_sur': { fr: 'Étape {n} sur {total}', en: 'Step {n} of {total}', es: 'Etapa {n} de {total}', ht: 'Etap {n} sou {total}' },

  // — États des écrans et erreurs (lib/erreurs.js, components/ui.jsx)
  'gen.ok': { fr: 'OK', en: 'OK', es: 'OK', ht: 'OK' },
  'gen.retour': { fr: 'Retour', en: 'Back', es: 'Volver', ht: 'Retounen' },
  'gen.supprimer': { fr: 'Supprimer', en: 'Delete', es: 'Eliminar', ht: 'Efase' },
  'gen.reglages': { fr: 'Ouvrir les réglages', en: 'Open settings', es: 'Abrir ajustes', ht: 'Louvri paramèt yo' },
  'gen.ou': { fr: 'ou', en: 'or', es: 'o', ht: 'oswa' },
  'etat.reseau': { fr: 'Connexion indisponible', en: 'No connection', es: 'Sin conexión', ht: 'Pa gen koneksyon' },
  'etat.delai': { fr: 'Le serveur ne répond pas', en: 'The server is not responding', es: 'El servidor no responde', ht: 'Sèvè a pa reponn' },
  'etat.refus': { fr: 'Accès refusé', en: 'Access denied', es: 'Acceso denegado', ht: 'Aksè refize' },
  'etat.introuvable': { fr: 'Introuvable', en: 'Not found', es: 'No encontrado', ht: 'Nou pa jwenn li' },
  'etat.session': { fr: 'Session expirée', en: 'Session expired', es: 'Sesión expirada', ht: 'Sesyon an fini' },
  'etat.erreur': { fr: 'Impossible de charger', en: 'Could not load', es: 'No se pudo cargar', ht: 'Nou pa rive chaje' },
  'etat.perimee': {
    fr: 'Connexion indisponible. Certaines données peuvent ne pas être à jour.',
    en: 'No connection. Some information may be out of date.',
    es: 'Sin conexión. Algunos datos pueden no estar actualizados.',
    ht: 'Pa gen koneksyon. Gen enfòmasyon ki ka pa ajou.',
  },
  'err.reseau': {
    fr: 'Vérifiez votre connexion Internet, puis réessayez.',
    en: 'Check your internet connection, then try again.',
    es: 'Compruebe su conexión a Internet y vuelva a intentarlo.',
    ht: 'Verifye koneksyon entènèt ou, epi eseye ankò.',
  },
  'err.delai': {
    fr: 'La réponse tarde trop (connexion lente ?). Réessayez dans un instant.',
    en: 'The answer is taking too long (slow connection?). Try again in a moment.',
    es: 'La respuesta tarda demasiado (¿conexión lenta?). Inténtelo en un momento.',
    ht: 'Repons lan twò long (koneksyon an lan?). Eseye ankò talè.',
  },
  'err.session': {
    fr: 'Votre session a expiré : reconnectez-vous.',
    en: 'Your session has expired: please sign in again.',
    es: 'Su sesión ha expirado: vuelva a iniciar sesión.',
    ht: 'Sesyon ou fini: konekte ankò.',
  },
  'err.refus': {
    fr: 'Vous n’avez pas accès à cette information.',
    en: 'You do not have access to this information.',
    es: 'No tiene acceso a esta información.',
    ht: 'Ou pa gen aksè ak enfòmasyon sa a.',
  },
  'err.introuvable': {
    fr: 'Cet élément n’existe pas ou n’est pas à votre nom.',
    en: 'This item does not exist or is not in your name.',
    es: 'Este elemento no existe o no está a su nombre.',
    ht: 'Bagay sa a pa egziste oswa li pa sou non w.',
  },
  'err.serveur': {
    fr: 'Le service est momentanément indisponible. Réessayez dans quelques minutes.',
    en: 'The service is temporarily unavailable. Try again in a few minutes.',
    es: 'El servicio no está disponible por el momento. Inténtelo en unos minutos.',
    ht: 'Sèvis la pa disponib pou kounye a. Eseye ankò nan kèk minit.',
  },
  'err.inconnue': {
    fr: 'Une erreur est survenue. Réessayez ; si elle persiste, écrivez-nous sur WhatsApp.',
    en: 'Something went wrong. Try again; if it persists, message us on WhatsApp.',
    es: 'Se produjo un error. Vuelva a intentarlo; si persiste, escríbanos por WhatsApp.',
    ht: 'Gen yon erè. Eseye ankò; si li kontinye, ekri nou sou WhatsApp.',
  },
  'err.metier': { fr: 'Demande refusée.', en: 'Request refused.', es: 'Solicitud rechazada.', ht: 'Demann lan refize.' },
  'err.PROFILE_INCOMPLETE': {
    fr: 'Complétez votre profil (téléphone, pays et ville) avant d\'annoncer un achat : nous en avons besoin pour vous remettre le colis.',
    en: 'Complete your profile (phone, country and city) before announcing a purchase: we need it to hand over your package.',
    es: 'Complete su perfil (teléfono, país y ciudad) antes de anunciar una compra: lo necesitamos para entregarle el paquete.',
    ht: 'Konplete pwofil ou (telefòn, peyi ak vil) anvan w anonse yon acha : nou bezwen l pou n remèt ou koli a.',
  },
  'pf.completer_bouton': { fr: 'Compléter mon profil', en: 'Complete my profile', es: 'Completar mi perfil', ht: 'Konplete pwofil mwen' },
  'err.PREALERT_STORE_REQUIRED': { fr: 'Indiquez le magasin.', en: 'Enter the store.', es: 'Indique la tienda.', ht: 'Mete magazen an.' },
  'err.PREALERT_DESCRIPTION_REQUIRED': { fr: 'Indiquez le contenu du colis.', en: 'Enter the package contents.', es: 'Indique el contenido del paquete.', ht: 'Mete sa ki nan koli a.' },
  'err.INVALID_TRACKING': {
    fr: 'Numéro de suivi illisible : lettres et chiffres seulement (6 à 60).',
    en: 'Unreadable tracking number: letters and digits only (6 to 60).',
    es: 'Número de seguimiento ilegible: solo letras y cifras (6 a 60).',
    ht: 'Nimewo swivi a pa li: lèt ak chif sèlman (6 a 60).',
  },
  'err.INVALID_VALUE': {
    fr: 'Valeur invalide : un montant entre 0 et 100 000 $.',
    en: 'Invalid value: an amount between 0 and 100,000 $.',
    es: 'Valor no válido: un importe entre 0 y 100 000 $.',
    ht: 'Valè a pa bon: yon montan ant 0 ak 100 000 $.',
  },
  'err.INVALID_SERVICE': { fr: 'Choisissez aérien ou maritime.', en: 'Choose air or sea.', es: 'Elija aéreo o marítimo.', ht: 'Chwazi pa lè oswa pa lanmè.' },
  'err.PREALERT_DUPLICATE': {
    fr: 'Ce numéro de suivi est déjà annoncé : la pré-alerte est dans votre liste.',
    en: 'This tracking number is already announced: the pre-alert is in your list.',
    es: 'Este número de seguimiento ya está anunciado: la prealerta está en su lista.',
    ht: 'Nimewo swivi sa a deja anonse: pre-alèt la nan lis ou.',
  },
  'err.PREALERT_ALREADY_RECEIVED': {
    fr: 'Ce colis est déjà arrivé à Miami.',
    en: 'This package has already arrived in Miami.',
    es: 'Este paquete ya llegó a Miami.',
    ht: 'Koli sa a deja rive Miami.',
  },
  'err.TOO_MANY_PREALERTS': {
    fr: 'Vous avez déjà 60 pré-alertes en attente : supprimez celles qui ne servent plus.',
    en: 'You already have 60 pending pre-alerts: delete the ones you no longer need.',
    es: 'Ya tiene 60 prealertas pendientes: elimine las que ya no necesite.',
    ht: 'Ou deja gen 60 pre-alèt k ap tann: efase sa ou pa bezwen yo.',
  },
  'err.ACCOUNT_HAS_SHIPMENTS': {
    fr: 'Vous avez encore des colis en route ou à retirer. Votre compte pourra être supprimé quand ils vous auront été remis.',
    en: 'You still have parcels on the way or waiting for pickup. Your account can be deleted once you have received them.',
    es: 'Todavía tiene paquetes en camino o por retirar. Su cuenta podrá eliminarse cuando se los hayan entregado.',
    ht: 'Ou gen koli ki toujou an wout oswa k ap tann ou. W ap ka efase kont ou a lè yo fin remèt ou yo.',
  },
  'err.ACCOUNT_HAS_BALANCE': {
    fr: 'Une facture reste à payer. Votre compte pourra être supprimé une fois le solde réglé.',
    en: 'An invoice is still unpaid. Your account can be deleted once the balance is paid.',
    es: 'Queda una factura por pagar. Su cuenta podrá eliminarse una vez saldado el importe.',
    ht: 'Gen yon fakti ki poko peye. W ap ka efase kont ou a lè w fin peye balans lan.',
  },
  'err.STAFF_ACCOUNT': {
    fr: "Un compte de l'équipe ne se supprime pas depuis l'application : un administrateur le ferme depuis le tableau de bord.",
    en: 'A team account cannot be deleted from the app: an administrator closes it from the dashboard.',
    es: 'Una cuenta del equipo no se elimina desde la aplicación: un administrador la cierra desde el panel.',
    ht: 'Yon kont ekip la pa efase nan aplikasyon an : se yon administratè ki fèmen l nan tablo de bò a.',
  },
  'err.CONFIRMATION_REQUIRED': { fr: 'Confirmez la suppression du compte.', en: 'Confirm the account deletion.', es: 'Confirme la eliminación de la cuenta.', ht: 'Konfime ou vle efase kont lan.' },
  'err.ACCOUNT_ALREADY_DELETED': { fr: 'Ce compte a déjà été supprimé.', en: 'This account has already been deleted.', es: 'Esta cuenta ya fue eliminada.', ht: 'Kont sa a te deja efase.' },
  'err.ACCOUNT_DELETION_UNAVAILABLE': {
    fr: "La suppression du compte n'est pas encore disponible. Écrivez-nous sur WhatsApp : nous la ferons pour vous.",
    en: 'Account deletion is not available yet. Message us on WhatsApp and we will do it for you.',
    es: 'La eliminación de la cuenta aún no está disponible. Escríbanos por WhatsApp y lo haremos por usted.',
    ht: 'Efase kont lan poko disponib. Ekri nou sou WhatsApp : n ap fè l pou ou.',
  },
  'err.TROP_LONG': { fr: 'Texte trop long.', en: 'Text too long.', es: 'Texto demasiado largo.', ht: 'Tèks la twò long.' },

  // — Connexion, inscription (compléments)
  'cx.session_expiree': {
    fr: 'Votre session a expiré : reconnectez-vous pour continuer.',
    en: 'Your session has expired: sign in again to continue.',
    es: 'Su sesión ha expirado: vuelva a iniciar sesión para continuar.',
    ht: 'Sesyon ou fini: konekte ankò pou kontinye.',
  },
  'cx.non_confirme': {
    fr: 'Confirmez d’abord votre adresse e-mail : ouvrez le lien que nous vous avons envoyé.',
    en: 'First confirm your email address: open the link we sent you.',
    es: 'Primero confirme su correo: abra el enlace que le enviamos.',
    ht: 'Konfime adrès imèl ou anvan: louvri lyen nou voye ba ou a.',
  },
  'cx.remplir': {
    fr: 'Indiquez votre e-mail et votre mot de passe.',
    en: 'Enter your email and password.',
    es: 'Indique su correo y su contraseña.',
    ht: 'Mete imèl ou ak modpas ou.',
  },
  'cx.voir_mdp': { fr: 'Afficher le mot de passe', en: 'Show password', es: 'Mostrar contraseña', ht: 'Montre modpas la' },
  'cx.cacher_mdp': { fr: 'Masquer le mot de passe', en: 'Hide password', es: 'Ocultar contraseña', ht: 'Kache modpas la' },
  'in.email_invalide': { fr: 'Adresse e-mail invalide.', en: 'Invalid email address.', es: 'Correo electrónico no válido.', ht: 'Adrès imèl la pa bon.' },
  'in.email_existe': {
    fr: 'Un compte existe déjà avec cette adresse : connectez-vous, ou utilisez « Mot de passe oublié ».',
    en: 'An account already exists with this address: sign in, or use “Forgot your password?”.',
    es: 'Ya existe una cuenta con este correo: inicie sesión o use «¿Olvidó su contraseña?».',
    ht: 'Gen yon kont deja ak adrès sa a: konekte, oswa sèvi ak « Ou bliye modpas ou? ».',
  },

  // — Accueil (compléments)
  'ac.action_requise': { fr: 'action requise', en: 'action required', es: 'acción requerida', ht: 'aksyon nesesè' },
  'ac.solde': { fr: 'Solde à payer', en: 'Balance due', es: 'Saldo a pagar', ht: 'Balans pou peye' },
  'ac.a_jour': { fr: 'Vous êtes à jour', en: 'You are all paid up', es: 'Está al día', ht: 'Ou ajou' },
  'ac.en_retard': { fr: 'dont {montant} en retard', en: 'including {montant} overdue', es: 'de ello {montant} vencido', ht: 'ladan l {montant} anreta' },
  'ac.suivre_titre': { fr: 'Suivre un colis', en: 'Track a package', es: 'Seguir un paquete', ht: 'Swiv yon koli' },
  'ac.suivre': { fr: 'Numéro GSE ou suivi', en: 'GSE number or tracking', es: 'Número GSE o seguimiento', ht: 'Nimewo GSE oswa swivi' },
  'ac.messages': { fr: 'Derniers messages', en: 'Latest messages', es: 'Últimos mensajes', ht: 'Dènye mesaj yo' },
  'ac.equipe': {
    fr: 'Compte de l’équipe : cette application est l’espace client. Le tableau de bord est sur le site et dans l’application de bureau.',
    en: 'Team account: this app is the customer space. The dashboard is on the website and in the desktop app.',
    es: 'Cuenta del equipo: esta aplicación es el espacio del cliente. El panel está en el sitio y en la aplicación de escritorio.',
    ht: 'Kont ekip la: aplikasyon sa a se espas kliyan an. Tablo bò a sou sit la ak nan aplikasyon òdinatè a.',
  },
  'msg.email': { fr: 'E-mail', en: 'Email', es: 'Correo', ht: 'Imèl' },
  'msg.whatsapp': { fr: 'WhatsApp', en: 'WhatsApp', es: 'WhatsApp', ht: 'WhatsApp' },
  'msg.push': { fr: 'Notification', en: 'Notification', es: 'Notificación', ht: 'Notifikasyon' },
  'msg.bienvenue': { fr: 'Bienvenue chez GoShip Express', en: 'Welcome to GoShip Express', es: 'Bienvenido a GoShip Express', ht: 'Byenveni lakay GoShip Express' },
  'msg.autre': { fr: 'Mise à jour', en: 'Update', es: 'Actualización', ht: 'Mizajou' },

  // — Mes colis (compléments)
  'co.action': { fr: 'Action requise', en: 'Action required', es: 'Acción requerida', ht: 'Aksyon nesesè' },
  'co.scanner': { fr: 'Scanner une étiquette', en: 'Scan a label', es: 'Escanear una etiqueta', ht: 'Eskane yon etikèt' },
  'co.aucun_resultat': {
    fr: 'Aucun de vos colis ne correspond.',
    en: 'None of your packages match.',
    es: 'Ninguno de sus paquetes coincide.',
    ht: 'Pa gen okenn nan koli ou yo ki koresponn.',
  },
  'co.effacer': { fr: 'Effacer la recherche', en: 'Clear search', es: 'Borrar la búsqueda', ht: 'Efase rechèch la' },
  'co.chargement': { fr: 'Chargement de vos colis…', en: 'Loading your packages…', es: 'Cargando sus paquetes…', ht: 'N ap chaje koli ou yo…' },

  // — Détail et suivi public
  'de.lieu': { fr: 'Lieu', en: 'Location', es: 'Lugar', ht: 'Kote' },
  'de.suivi_magasin': { fr: 'Suivi du magasin', en: 'Store tracking', es: 'Seguimiento de la tienda', ht: 'Swivi magazen an' },
  'su.titre': { fr: 'Suivi du colis', en: 'Package tracking', es: 'Seguimiento del paquete', ht: 'Swivi koli a' },
  'su.introuvable': {
    fr: 'Aucun colis ne porte ce numéro. Vérifiez-le, ou attendez que le colis soit reçu à Miami.',
    en: 'No package has this number. Check it, or wait until the package is received in Miami.',
    es: 'Ningún paquete tiene este número. Verifíquelo o espere a que el paquete se reciba en Miami.',
    ht: 'Pa gen koli ki gen nimewo sa a. Verifye l, oswa tann koli a rive Miami.',
  },
  'su.public': {
    fr: 'Suivi public : seules les étapes sont affichées. Si ce colis est à vous, il apparaît dans « Mes colis ».',
    en: 'Public tracking: only the steps are shown. If this package is yours, it appears in “My packages”.',
    es: 'Seguimiento público: solo se muestran las etapas. Si este paquete es suyo, aparece en «Mis paquetes».',
    ht: 'Swivi piblik: se etap yo sèlman ki parèt. Si koli sa a pou ou, l ap parèt nan « Koli mwen yo ».',
  },

  // — Pré-alerte (compléments)
  'pa.suivi_aide': {
    fr: 'Facultatif : celui que le magasin vous a donné (Amazon TBA…, UPS 1Z…).',
    en: 'Optional: the one the store gave you (Amazon TBA…, UPS 1Z…).',
    es: 'Opcional: el que le dio la tienda (Amazon TBA…, UPS 1Z…).',
    ht: 'Opsyonèl: sa magazen an ba ou a (Amazon TBA…, UPS 1Z…).',
  },
  'pa.supprimer_question': {
    fr: 'Supprimer cette pré-alerte ?',
    en: 'Delete this pre-alert?',
    es: '¿Eliminar esta prealerta?',
    ht: 'Efase pre-alèt sa a?',
  },
  'pa.supprimee': { fr: 'Pré-alerte supprimée.', en: 'Pre-alert deleted.', es: 'Prealerta eliminada.', ht: 'Pre-alèt la efase.' },
  'pa.envoi': { fr: 'Envoi…', en: 'Sending…', es: 'Enviando…', ht: 'N ap voye…' },
  'pa.plus': { fr: 'Voir plus', en: 'Show more', es: 'Ver más', ht: 'Wè plis' },

  // — Scanner
  'sc.titre_colis': { fr: 'Scanner une étiquette GoShip', en: 'Scan a GoShip label', es: 'Escanear una etiqueta GoShip', ht: 'Eskane yon etikèt GoShip' },
  'sc.viser': {
    fr: 'Placez le code-barres ou le QR code dans le cadre.',
    en: 'Place the barcode or QR code inside the frame.',
    es: 'Coloque el código de barras o el QR dentro del marco.',
    ht: 'Mete kòd-ba a oswa kòd QR a nan kad la.',
  },
  'sc.invalide': {
    fr: 'Ce code n’est ni un numéro GoShip ni un suivi de magasin. Visez un autre code.',
    en: 'This code is neither a GoShip number nor a store tracking number. Aim at another code.',
    es: 'Este código no es un número GoShip ni un seguimiento de tienda. Apunte a otro código.',
    ht: 'Kòd sa a pa ni yon nimewo GoShip ni yon swivi magazen. Vize yon lòt kòd.',
  },
  'sc.etiquette_goship': {
    fr: 'C’est une étiquette GoShip (colis déjà reçu), pas le suivi du magasin.',
    en: 'This is a GoShip label (package already received), not the store tracking number.',
    es: 'Es una etiqueta GoShip (paquete ya recibido), no el seguimiento de la tienda.',
    ht: 'Sa se yon etikèt GoShip (koli deja resevwa), se pa swivi magazen an.',
  },
  'sc.bloquee': {
    fr: 'L’appareil photo est bloqué pour GoShip Express. Autorisez-le dans les réglages du téléphone.',
    en: 'The camera is blocked for GoShip Express. Allow it in your phone settings.',
    es: 'La cámara está bloqueada para GoShip Express. Permítala en los ajustes del teléfono.',
    ht: 'Kamera a bloke pou GoShip Express. Pèmèt li nan paramèt telefòn nan.',
  },
  'sc.autoriser': { fr: 'Autoriser l’appareil photo', en: 'Allow the camera', es: 'Permitir la cámara', ht: 'Pèmèt kamera a' },
  'sc.indisponible': {
    fr: 'L’appareil photo est indisponible. Saisissez le numéro à la main.',
    en: 'The camera is unavailable. Type the number instead.',
    es: 'La cámara no está disponible. Escriba el número a mano.',
    ht: 'Kamera a pa disponib. Tape nimewo a.',
  },

  // — Factures (compléments)
  'fa.total': { fr: 'Total', en: 'Total', es: 'Total', ht: 'Total' },
  'fa.paye': { fr: 'Payé', en: 'Paid', es: 'Pagado', ht: 'Peye' },
  'fa.reste': { fr: 'Reste à payer', en: 'Balance', es: 'Saldo', ht: 'Rès pou peye' },
  'fa.echeance': { fr: 'Échéance', en: 'Due date', es: 'Vencimiento', ht: 'Dat limit' },
  'fa.lignes': { fr: 'Détail', en: 'Details', es: 'Detalle', ht: 'Detay' },
  'fa.frais': { fr: 'Frais de service', en: 'Service fee', es: 'Cargo por servicio', ht: 'Frè sèvis' },
  'fa.paiements': { fr: 'Paiements reçus', en: 'Payments received', es: 'Pagos recibidos', ht: 'Peman resevwa' },
  'fa.aucun_paiement': { fr: 'Aucun paiement reçu pour l’instant.', en: 'No payment received yet.', es: 'Aún no se ha recibido ningún pago.', ht: 'Poko gen peman resevwa.' },
  'fa.detail_titre': { fr: 'Facture', en: 'Invoice', es: 'Factura', ht: 'Fakti' },
  'fa.annulees': { fr: 'Annulées', en: 'Cancelled', es: 'Anuladas', ht: 'Anile' },
  'fa.etat.a_payer': { fr: 'À payer', en: 'To pay', es: 'A pagar', ht: 'Pou peye' },
  'fa.etat.partielle': { fr: 'Payée en partie', en: 'Partly paid', es: 'Pagada en parte', ht: 'Peye an pati' },
  'fa.etat.en_retard': { fr: 'En retard', en: 'Overdue', es: 'Vencida', ht: 'Anreta' },
  'fa.etat.payee': { fr: 'Payée', en: 'Paid', es: 'Pagada', ht: 'Peye' },
  'fa.etat.annulee': { fr: 'Annulée', en: 'Cancelled', es: 'Anulada', ht: 'Anile' },
  'moyen.paypal': { fr: 'Carte / PayPal', en: 'Card / PayPal', es: 'Tarjeta / PayPal', ht: 'Kat / PayPal' },
  'moyen.banque': { fr: 'Virement bancaire', en: 'Bank transfer', es: 'Transferencia bancaria', ht: 'Virman labank' },
  'moyen.azul': { fr: 'Azul', en: 'Azul', es: 'Azul', ht: 'Azul' },
  'moyen.moncash': { fr: 'MonCash', en: 'MonCash', es: 'MonCash', ht: 'MonCash' },
  'moyen.natcash': { fr: 'NatCash', en: 'NatCash', es: 'NatCash', ht: 'NatCash' },
  'moyen.especes': { fr: 'Espèces', en: 'Cash', es: 'Efectivo', ht: 'Kach' },
  'moyen.transfert': { fr: 'Transfert d’argent', en: 'Money transfer', es: 'Envío de dinero', ht: 'Transfè lajan' },
  'moyen.autre': { fr: 'Autre', en: 'Other', es: 'Otro', ht: 'Lòt' },

  // — Compte (compléments)
  'cp.version': { fr: 'Version', en: 'Version', es: 'Versión', ht: 'Vèsyon' },
  'cp.supprimer': { fr: 'Supprimer mon compte', en: 'Delete my account', es: 'Eliminar mi cuenta', ht: 'Efase kont mwen' },
  'cp.supprimer_titre': { fr: 'Supprimer votre compte ?', en: 'Delete your account?', es: '¿Eliminar su cuenta?', ht: 'Efase kont ou a ?' },
  'cp.supprimer_texte': {
    fr: "Votre nom, votre e-mail, votre téléphone et votre adresse seront effacés, et vous ne pourrez plus vous connecter. Vos factures et l'historique de vos colis sont gardés, sans vos coordonnées, comme la loi l'exige. C'est définitif.",
    en: 'Your name, email, phone number and address will be erased, and you will no longer be able to sign in. Your invoices and parcel history are kept, without your contact details, as the law requires. This cannot be undone.',
    es: 'Su nombre, correo, teléfono y dirección se borrarán y ya no podrá iniciar sesión. Sus facturas y el historial de sus paquetes se conservan, sin sus datos de contacto, como exige la ley. Es definitivo.',
    ht: 'Non ou, imèl ou, telefòn ou ak adrès ou ap efase, epi ou p ap ka konekte ankò. Fakti ou yo ak istwa koli ou yo rete, san enfòmasyon kontak ou, jan lalwa mande l. Sa pa ka defèt.',
  },
  'cp.supprimer_oui': { fr: 'Supprimer définitivement', en: 'Delete permanently', es: 'Eliminar definitivamente', ht: 'Efase nèt' },
  'cp.supprime': { fr: 'Votre compte a été supprimé.', en: 'Your account has been deleted.', es: 'Su cuenta ha sido eliminada.', ht: 'Kont ou a efase.' },
  'cp.confidentialite': { fr: 'Confidentialité', en: 'Privacy', es: 'Privacidad', ht: 'Konfidansyalite' },
  'cp.notif.active': { fr: 'Activées', en: 'On', es: 'Activadas', ht: 'Aktive' },
  'cp.notif.refusee': { fr: 'Refusées : à autoriser dans les réglages', en: 'Declined: allow them in settings', es: 'Rechazadas: permítalas en ajustes', ht: 'Refize: pèmèt yo nan paramèt' },
  'cp.notif.indisponible': { fr: 'Indisponibles sur cet appareil', en: 'Unavailable on this device', es: 'No disponibles en este dispositivo', ht: 'Pa disponib sou aparèy sa a' },
  'cp.notif.non_configuree': { fr: 'Pas encore en service', en: 'Not yet in service', es: 'Aún no están en servicio', ht: 'Poko an sèvis' },
  'cp.notif.erreur': { fr: 'Momentanément indisponibles', en: 'Temporarily unavailable', es: 'No disponibles por el momento', ht: 'Pa disponib pou kounye a' },
  'cp.notif.inconnue': { fr: 'Activer', en: 'Turn on', es: 'Activar', ht: 'Aktive' },

  // — Agences (compléments)
  'ag.adresse_inconnue': {
    fr: 'Adresse communiquée sur demande : appelez-nous.',
    en: 'Address available on request: call us.',
    es: 'Dirección disponible a petición: llámenos.',
    ht: 'N ap ba w adrès la si w mande: rele nou.',
  },

  // — Services et pays
  'service.aerien': { fr: 'Aérien', en: 'Air', es: 'Aéreo', ht: 'Pa lè' },
  'service.maritime': { fr: 'Maritime', en: 'Sea', es: 'Marítimo', ht: 'Pa lanmè' },
  'service.terrestre': { fr: 'Terrestre', en: 'Land', es: 'Terrestre', ht: 'Pa tè' },
  'pays.HT': { fr: 'Haïti', en: 'Haiti', es: 'Haití', ht: 'Ayiti' },
  'pays.DO': { fr: 'République dominicaine', en: 'Dominican Republic', es: 'República Dominicana', ht: 'Repiblik Dominikèn' },
  'pays.US': { fr: 'États-Unis', en: 'United States', es: 'Estados Unidos', ht: 'Etazini' },
};

const CLE_LANGUE = 'gse.langue';

function langueDuTelephone() {
  const codes = (getLocales() || []).map((l) => (l.languageCode || '').toLowerCase());
  const connue = codes.find((c) => LANGUES.some((l) => l.code === c));
  return connue || 'fr';
}

const Contexte = createContext({ langue: 'fr', t: (c) => c, changerLangue: () => {} });

export function FournisseurLangue({ children }) {
  const [langue, setLangue] = useState(langueDuTelephone());

  useEffect(() => {
    AsyncStorage.getItem(CLE_LANGUE)
      .then((v) => { if (v && LANGUES.some((l) => l.code === v)) setLangue(v); })
      .catch(() => {});
  }, []);

  const valeur = useMemo(() => ({
    langue,
    t: (cle, remplacements) => traduire(cle, langue, remplacements),
    changerLangue: (code) => {
      setLangue(code);
      AsyncStorage.setItem(CLE_LANGUE, code).catch(() => {});
    },
  }), [langue]);

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function traduire(cle, langue = 'fr', remplacements) {
  const entree = T[cle];
  let texte = entree ? (entree[langue] || entree.fr) : cle;
  if (remplacements) {
    Object.keys(remplacements).forEach((k) => {
      texte = texte.split('{' + k + '}').join(String(remplacements[k]));
    });
  }
  return texte;
}

export function useLangue() {
  return useContext(Contexte);
}
