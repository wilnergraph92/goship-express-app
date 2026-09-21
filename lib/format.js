// Mise en forme des dates, des poids et des montants, selon la langue choisie.

import { traduire } from './i18n';

const AUJOURDHUI = { fr: "Aujourd'hui", en: 'Today', es: 'Hoy', ht: 'Jodi a' };
const HIER = { fr: 'Hier', en: 'Yesterday', es: 'Ayer', ht: 'Yè' };
const A = { fr: 'à', en: 'at', es: 'a las', ht: 'a' };

function deuxChiffres(n) {
  return String(n).padStart(2, '0');
}

export function dateCourte(iso, langue = 'fr') {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const jour = deuxChiffres(d.getDate());
  const mois = deuxChiffres(d.getMonth() + 1);
  if (langue === 'en') return `${mois}/${jour}/${d.getFullYear()}`;
  return `${jour}/${mois}/${d.getFullYear()}`;
}

export function heure(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${deuxChiffres(d.getHours())}:${deuxChiffres(d.getMinutes())}`;
}

// « Aujourd'hui à 08:15 », « Hier à 18:40 », sinon « 18/09/2026 · 14:28 »
export function dateRelative(iso, langue = 'fr') {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const jour = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const aujourdhui = new Date();
  const debutAujourdhui = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate());
  const ecart = Math.round((debutAujourdhui - jour) / 86400000);
  if (ecart === 0) return `${AUJOURDHUI[langue] || AUJOURDHUI.fr} ${A[langue] || A.fr} ${heure(iso)}`;
  if (ecart === 1) return `${HIER[langue] || HIER.fr} ${A[langue] || A.fr} ${heure(iso)}`;
  return `${dateCourte(iso, langue)} · ${heure(iso)}`;
}

function nombre(valeur, decimales, langue) {
  const n = Number(valeur);
  if (!Number.isFinite(n)) return '';
  const texte = n.toFixed(decimales);
  return langue === 'en' ? texte : texte.replace('.', ',');
}

export function poids(lb, langue = 'fr') {
  if (lb === null || lb === undefined || lb === '') return '—';
  return `${nombre(lb, 1, langue)} lb`;
}

export function montant(usd, langue = 'fr') {
  if (usd === null || usd === undefined || usd === '') return '—';
  const n = nombre(usd, 2, langue);
  return langue === 'en' ? `$${n}` : `${n} $`;
}

export function libelleStatut(statut, langue = 'fr') {
  return traduire('statut.' + statut, langue);
}

export function libelleService(service, langue = 'fr') {
  return traduire('service.' + service, langue);
}

export function libellePays(pays, langue = 'fr') {
  return traduire('pays.' + pays, langue);
}
