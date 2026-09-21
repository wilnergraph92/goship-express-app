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
  'ac.en_route': { fr: 'en route', en: 'on the way', es: 'en camino', ht: 'an wout' },
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
  'pa.suivi': { fr: 'Numéro de suivi du magasin', en: 'Store tracking number', es: 'Número de seguimiento de la tienda', ht: 'Nimewo swivi magazen an' },
  'pa.scanner': { fr: 'Scanner le code-barres', en: 'Scan the barcode', es: 'Escanear el código de barras', ht: 'Eskane kòd-ba a' },
  'pa.valeur': { fr: 'Valeur (US $)', en: 'Value (US $)', es: 'Valor (US $)', ht: 'Valè (US $)' },
  'pa.photo': { fr: 'Ajouter une photo', en: 'Add a photo', es: 'Añadir una foto', ht: 'Ajoute yon foto' },
  'pa.photo_texte': {
    fr: 'Facultatif · accélère le dédouanement',
    en: 'Optional · speeds up customs',
    es: 'Opcional · agiliza la aduana',
    ht: 'Opsyonèl · fè ladwàn pi rapid',
  },
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
    fr: 'Carte bancaire · [autres moyens de paiement à définir]',
    en: 'Bank card · [other payment methods to be defined]',
    es: 'Tarjeta bancaria · [otros medios de pago por definir]',
    ht: 'Kat bankè · [lòt mwayen peman pou defini]',
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
