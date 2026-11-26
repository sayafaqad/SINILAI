export const EMPTY = '—';

let numberFormatters = {};

function numberFormatter(digits) {
  if (!numberFormatters[digits]) {
    numberFormatters[digits] = new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }
  return numberFormatters[digits];
}

/** Indonesian convention: thousands dot, decimal comma (1.240 / 87,5). */
export function formatNumber(value, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY;
  return numberFormatter(digits).format(value);
}

/** Scores/averages: one decimal, or an honest em dash when missing. */
export function formatScore(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY;
  return numberFormatter(1).format(value);
}

/**
 * Parse a score cell. Empty input clears the score (returns value: null),
 * anything outside 0–100 (integers only) is rejected with a message.
 */
export function parseScoreInput(raw) {
  const text = String(raw ?? '').trim();
  if (text === '') return { ok: true, value: null, message: '' };
  if (!/^\d{1,3}$/.test(text)) {
    return { ok: false, value: null, message: 'Gunakan angka bulat 0–100.' };
  }
  const value = Number(text);
  if (value > 100) return { ok: false, value: null, message: 'Nilai maksimal 100.' };
  return { ok: true, value, message: '' };
}

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

export function normalizeSpaces(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

/** Title-case a person or school name typed by hand. */
export function toTitleCase(value) {
  return normalizeSpaces(value)
    .toLowerCase()
    .replace(/(^|\s|\/|-)([a-z])/g, (m, sep, ch) => `${sep}${ch.toUpperCase()}`);
}

export function parseGradeLevel(className) {
  const match = String(className ?? '').match(/\d{1,2}/);
  if (!match) return '';
  return String(Number(match[0])).padStart(2, '0');
}
