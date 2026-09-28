// Option parsing for the embeddable widget: element attributes, frame query
// string and the public JS API all end up in one normalised shape.
import type { Lang } from '../src/i18n/translations';

export type EmbedTheme = 'dark' | 'light' | 'auto';

/** What an embedder may pass (attributes or LibertexSocialWidget.mount()). */
export interface EmbedOptions {
  lang?: string;
  theme?: string;
  locale?: string;
  /** Background blobs; on by default. */
  blobs?: boolean;
  /** Mount only when the element approaches the viewport; on by default. */
  lazy?: boolean;
  /** Push pelican_* events into window.dataLayer; on by default. */
  dataLayer?: boolean;
  /** Query string appended to libertex.copy-trade.io links (utm_* + allowlist). */
  linkParams?: string;
  /** Absolute https URL of the live-data proxy. */
  apiBase?: string;
  /** Absolute https URL of the static catalog (must differ from apiBase). */
  catalogBase?: string;
}

export interface ResolvedOptions {
  lang: Lang;
  theme: EmbedTheme;
  locale: string;
  blobs: boolean;
  lazy: boolean;
  dataLayer: boolean;
  linkParams: string;
  apiBase: string;
  catalogBase: string;
}

export const DEFAULT_API_BASE = __PELICAN_API_BASE__;
export const DEFAULT_CATALOG_BASE = __PELICAN_CATALOG_BASE__;

const LANGS: readonly Lang[] = ['en', 'ru', 'es'];
const THEMES: readonly EmbedTheme[] = ['dark', 'light', 'auto'];
/** Non-utm keys that may travel to libertex.copy-trade.io links. */
const EXTRA_LINK_KEYS = new Set(['ref', 'partner', 'aff_id', 'sub_id', 'click_id', 'promo']);
const LOCALE_RE = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8}){0,2}$/;

/**
 * A locale the component can actually use: toLocaleString() throws a
 * RangeError for tags that pass a shape check but that Intl rejects
 * (e.g. "en-12"), which would break every number cell. -> canonical tag | null.
 */
export function normLocale(v: string | null | undefined): string | null {
  const s = String(v || '').trim();
  if (!s || !LOCALE_RE.test(s)) return null;
  try {
    const canon = Intl.getCanonicalLocales(s)[0];
    if (!canon) return null;
    new Intl.NumberFormat(canon);
    new Intl.DateTimeFormat(canon);
    (1234.5).toLocaleString(canon);
    return canon;
  } catch {
    return null;
  }
}

export function warn(msg: string): void {
  try {
    console.warn('[LibertexSocialWidget] ' + msg);
  } catch {
    /* no console */
  }
}

/** 'ru-RU' / 'RU' / 'ru' -> 'ru'; anything unsupported -> null. */
export function normLang(v: string | null | undefined): Lang | null {
  const l = String(v || '').trim().toLowerCase().slice(0, 2) as Lang;
  return LANGS.includes(l) ? l : null;
}

function normTheme(v: string | null | undefined): EmbedTheme | null {
  const t = String(v || '').trim().toLowerCase() as EmbedTheme;
  return THEMES.includes(t) ? t : null;
}

/** Absolute https URL without query/hash/trailing slash, else null. */
export function httpsBase(v: string | null | undefined): string | null {
  if (!v || typeof v !== 'string') return null;
  try {
    const u = new URL(v.trim());
    if (u.protocol !== 'https:' || u.username || u.password) return null;
    return u.origin + u.pathname.replace(/\/+$/, '');
  } catch {
    return null; // relative or garbage
  }
}

/** Keeps only utm_* and allowlisted keys; values capped at 256 chars. */
export function filterLinkParams(raw: string | null | undefined, allowExtra = true): string {
  if (!raw || typeof raw !== 'string') return '';
  let src: URLSearchParams;
  try {
    src = new URLSearchParams(raw.trim().replace(/^[?#]/, ''));
  } catch {
    return '';
  }
  const out = new URLSearchParams();
  src.forEach((value, key) => {
    const k = key.toLowerCase();
    const ok = /^utm_[a-z0-9_]{1,40}$/.test(k) || (allowExtra && EXTRA_LINK_KEYS.has(k));
    if (ok && value.length <= 256) out.append(k, value);
  });
  return out.toString();
}

function pageLang(): Lang | null {
  try {
    return normLang(document.documentElement.getAttribute('lang'));
  } catch {
    return null;
  }
}

function onOff(v: string | null | undefined, dflt: boolean): boolean {
  if (v == null) return dflt;
  const s = String(v).trim().toLowerCase();
  if (s === 'off' || s === 'false' || s === '0' || s === 'no') return false;
  if (s === 'on' || s === 'true' || s === '1' || s === 'yes' || s === '') return true;
  return dflt;
}

/** Attribute names read from a host element (data-* first, bare name for the custom element). */
export const ATTRS = [
  'lang',
  'theme',
  'locale',
  'blobs',
  'lazy',
  'datalayer',
  'link-params',
  'api-base',
  'catalog-base',
] as const;

export function optionsFromElement(el: Element): EmbedOptions {
  const custom = el.localName === 'libertex-social-catalog';
  const a = (n: string): string | undefined => {
    const v = el.getAttribute('data-' + n) ?? (custom ? el.getAttribute(n) : null);
    return v == null ? undefined : v;
  };
  const bool = (n: string) => {
    const v = a(n);
    return v === undefined ? undefined : onOff(v, true);
  };
  return {
    lang: a('lang'),
    theme: a('theme'),
    locale: a('locale'),
    blobs: bool('blobs'),
    lazy: bool('lazy'),
    dataLayer: bool('datalayer'),
    linkParams: a('link-params'),
    apiBase: a('api-base'),
    catalogBase: a('catalog-base'),
  };
}

/** frame.html: only a whitelist of query params is honoured (no endpoint overrides). */
export function optionsFromQuery(search: string): EmbedOptions {
  const q = new URLSearchParams(search);
  const utm = new URLSearchParams();
  q.forEach((v, k) => {
    if (/^utm_[a-z0-9_]{1,40}$/i.test(k)) utm.append(k, v);
  });
  const get = (k: string) => q.get(k) ?? undefined;
  return {
    lang: get('lang'),
    theme: get('theme'),
    locale: get('locale'),
    blobs: q.has('blobs') ? onOff(q.get('blobs'), true) : undefined,
    lazy: false,
    dataLayer: false, // the parent page's helper pushes to its own dataLayer
    linkParams: filterLinkParams(utm.toString(), false),
  };
}

export function resolveOptions(o: EmbedOptions): ResolvedOptions {
  const lang = normLang(o.lang) ?? pageLang() ?? 'en';
  if (o.lang && !normLang(o.lang)) warn(`unsupported lang "${o.lang}", using "${lang}"`);
  const theme = normTheme(o.theme) ?? 'dark';
  if (o.theme && !normTheme(o.theme)) warn(`unsupported theme "${o.theme}", using "dark"`);
  const locale = normLocale(o.locale) ?? 'en-US';
  if (o.locale && !normLocale(o.locale)) warn(`unsupported locale "${o.locale}", using "en-US"`);

  let apiBase = DEFAULT_API_BASE;
  let catalogBase = DEFAULT_CATALOG_BASE;
  if (o.apiBase != null) {
    const v = httpsBase(o.apiBase);
    if (v) apiBase = v;
    else warn('api-base must be an absolute https URL; using the default');
  }
  if (o.catalogBase != null) {
    const v = httpsBase(o.catalogBase);
    if (v) catalogBase = v;
    else warn('catalog-base must be an absolute https URL; using the default');
  }
  if (apiBase === catalogBase) {
    // Equal bases switch the component into legacy progress polling.
    warn('catalog-base must differ from api-base; using the defaults');
    apiBase = DEFAULT_API_BASE;
    catalogBase = DEFAULT_CATALOG_BASE;
  }

  return {
    lang,
    theme,
    locale,
    blobs: o.blobs ?? true,
    lazy: o.lazy ?? true,
    dataLayer: o.dataLayer ?? true,
    linkParams: filterLinkParams(o.linkParams),
    apiBase,
    catalogBase,
  };
}
