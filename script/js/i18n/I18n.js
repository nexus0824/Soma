import ko from './locales/ko.js';
import en from './locales/en.js';

const LANG_KEY = 'soma_lang';
const LOCALES = { ko, en };
const FALLBACK = 'en';
let current = 'ko';

export const LANGUAGES = Object.keys(LOCALES);

function lookup(obj, key) {
  let cur = obj;
  for (const part of key.split('.')) {
    if (cur === undefined || cur === null) return undefined;
    cur = cur[part];
  }
  return cur;
}

export function registerLocale(id, table) {
  LOCALES[id] = table;
  if (!LANGUAGES.includes(id)) LANGUAGES.push(id);
}

export function detectLanguage() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && LOCALES[saved]) return saved;
  } catch (e) {
    return FALLBACK;
  }
  const nav = ((typeof navigator !== 'undefined' && navigator.language) || FALLBACK).slice(0, 2).toLowerCase();
  return LOCALES[nav] ? nav : FALLBACK;
}

export function getLanguage() {
  return current;
}

export function setLanguage(id) {
  if (!LOCALES[id]) return false;
  current = id;
  try {
    localStorage.setItem(LANG_KEY, id);
  } catch (e) {
    return true;
  }
  return true;
}

export function nextLanguage() {
  const idx = LANGUAGES.indexOf(current);
  return LANGUAGES[(idx + 1) % LANGUAGES.length];
}

export function raw(key) {
  const v = lookup(LOCALES[current], key);
  return v !== undefined ? v : lookup(LOCALES[FALLBACK], key);
}

export function t(key, params) {
  const v = raw(key);
  if (v === undefined) return key;
  if (typeof v !== 'string') return v;
  if (!params) return v;
  return v.replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined ? params[k] : m));
}

current = detectLanguage();
