// Ce qu'une erreur veut dire pour l'utilisateur.
//
// Une requête peut échouer pour des raisons très différentes : pas de réseau, serveur
// trop lent, session expirée, accès refusé, règle métier (doublon, champ manquant…),
// panne du serveur. L'écran doit dire laquelle, avec des mots simples et traduits —
// jamais « undefined », « Error 500 » ni une trace technique. Le détail technique ne
// va que dans le journal de développement (journal()), jamais à l'écran.

export const TYPES = ['reseau', 'delai', 'session', 'refus', 'introuvable', 'metier', 'serveur', 'inconnue'];

// Codes métier renvoyés par la base (message = CODE, hint = 'goship') que l'application
// sait traduire. Les autres sont affichés avec la phrase française de la base.
export const CODES_METIER = [
  'PREALERT_STORE_REQUIRED', 'PREALERT_DESCRIPTION_REQUIRED', 'INVALID_TRACKING', 'INVALID_VALUE',
  'INVALID_SERVICE', 'PREALERT_DUPLICATE', 'PREALERT_ALREADY_RECEIVED', 'TOO_MANY_PREALERTS',
  'ACCOUNT_HAS_SHIPMENTS', 'ACCOUNT_HAS_BALANCE', 'STAFF_ACCOUNT', 'CONFIRMATION_REQUIRED',
  'ACCOUNT_ALREADY_DELETED', 'ACCOUNT_DELETION_UNAVAILABLE', 'PROFILE_INCOMPLETE',
];

function texte(v) {
  return v === null || v === undefined ? '' : String(v);
}

// → { type, code, detail } ; detail est la phrase de la base (règle métier seulement)
export function classer(e) {
  if (!e) return { type: 'inconnue', code: '', detail: '' };
  if (e.goship) return e.goship; // déjà classée
  const message = texte(e.message);
  const nom = texte(e.name);
  const code = texte(e.code);
  const statut = Number(e.status || 0);
  const indice = texte(e.hint);

  if (nom === 'AbortError' || /AbortError|aborted/i.test(message) || /aborted/i.test(indice)) {
    return { type: 'delai', code: 'DELAI', detail: '' };
  }
  if (nom === 'AuthRetryableFetchError' || /Network request failed|Failed to fetch|NetworkError|FetchError|Load failed/i.test(message)) {
    return { type: 'reseau', code: 'RESEAU', detail: '' };
  }
  if (indice === 'goship' && message) {
    if (message === 'PERMISSION_DENIED') return { type: 'refus', code: message, detail: texte(e.details) };
    return { type: 'metier', code: message, detail: texte(e.details) };
  }
  if (code === 'PGRST301' || code === 'PGRST302' || /JWT expired|invalid JWT|refresh_token_not_found|Refresh Token/i.test(message)
      || texte(e.code) === 'refresh_token_not_found' || texte(e.error_code) === 'refresh_token_not_found') {
    return { type: 'session', code: 'SESSION', detail: '' };
  }
  if (code === '42501' || statut === 401 || statut === 403) return { type: 'refus', code: 'REFUS', detail: '' };
  if (code === 'PGRST116' || statut === 404) return { type: 'introuvable', code: 'INTROUVABLE', detail: '' };
  if (statut >= 500 || /^5\d\d$/.test(code) || code === 'PGRST002') return { type: 'serveur', code: 'SERVEUR', detail: '' };
  return { type: 'inconnue', code: code || 'INCONNUE', detail: '' };
}

// Une erreur prête à être lancée par lib/api.js : l'écran n'a plus qu'à la lire
export function erreurGoship(e) {
  const c = classer(e);
  const err = new Error(c.code || c.type);
  err.goship = c;
  journal('erreur', c.type + ' ' + c.code, e);
  return err;
}

// La phrase à montrer, dans la langue de l'application
export function messageErreur(e, t) {
  const c = classer(e);
  if (c.type === 'metier') {
    if (CODES_METIER.indexOf(c.code) >= 0) {
      const traduit = t('err.' + c.code);
      // « déjà arrivé » : la base donne le numéro du colis dans sa phrase
      if (c.code === 'PREALERT_ALREADY_RECEIVED') {
        const numero = (/GSE-[0-9A-Z-]+/.exec(c.detail) || [''])[0];
        return numero ? traduit + ' (' + numero + ')' : traduit;
      }
      return traduit;
    }
    return c.detail || t('err.inconnue');
  }
  return t('err.' + c.type);
}

// Journal de développement : rien en production (pas de console dans l'application
// publiée), et jamais de jeton, de mot de passe ni de donnée personnelle.
export function nettoyer(texteBrut) {
  return texte(texteBrut)
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[jeton]')
    .replace(/(sb_(?:publishable|secret)_)[\w-]+/g, '$1[clé]')
    .replace(/ExponentPushToken\[[^\]]*\]/g, 'ExponentPushToken[…]')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[e-mail]')
    .replace(/("?(?:password|mot_?de_?passe|refresh_token|access_token)"?\s*[:=]\s*)"[^"]*"/gi, '$1"[masqué]"');
}

export function journal(niveau, quoi, e) {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  const detail = e ? nettoyer((e.message || '') + ' ' + (e.code || '') + ' ' + (e.status || '')) : '';
  // eslint-disable-next-line no-console
  console.warn('[goship ' + niveau + '] ' + nettoyer(quoi) + (detail.trim() ? ' — ' + detail.trim() : ''));
}
