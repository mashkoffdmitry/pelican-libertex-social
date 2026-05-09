import { inject, provide, ref, watch, type InjectionKey, type Ref } from 'vue';
import { TRANSLATIONS, type Lang, type TranslationKey } from '../i18n/translations';

const STORAGE_KEY = 'pelican-lang';
const DEFAULT_LANG: Lang = 'en';

function readStored(): Lang | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'en' || v === 'ru') return v;
  } catch {
    /* storage unavailable (SSR / private mode) */
  }
  return null;
}

export interface I18nApi {
  lang: Ref<Lang>;
  t(key: TranslationKey, vars?: Record<string, string | number>): string;
  setLang(l: Lang): void;
  cycleLang(): void;
}

export const I18N_KEY: InjectionKey<I18nApi> = Symbol('pelican.i18n');

// Mirrors the useTheme pattern: root component creates the reactive state and
// provides it; descendants inject it via useI18n(). Locale persists in
// localStorage under `pelican-lang`.
export function provideI18n(initial: Lang = DEFAULT_LANG): I18nApi {
  const lang = ref<Lang>(readStored() ?? initial);

  watch(lang, (l) => {
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  });

  const t: I18nApi['t'] = (key, vars) => {
    const dict = TRANSLATIONS[lang.value] ?? TRANSLATIONS.en;
    let s: string = dict[key] ?? TRANSLATIONS.en[key] ?? (key as string);
    if (vars) {
      for (const k in vars) {
        s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(vars[k]));
      }
    }
    return s;
  };

  const api: I18nApi = {
    lang,
    t,
    setLang: (l) => {
      lang.value = l;
    },
    cycleLang: () => {
      lang.value = lang.value === 'en' ? 'ru' : 'en';
    },
  };

  provide(I18N_KEY, api);
  return api;
}

// Used by descendant components. Falls back to a no-op English-only API if
// the component is rendered outside a provideI18n() scope (e.g. someone
// renders a sub-component standalone in a test).
export function useI18n(): I18nApi {
  const api = inject(I18N_KEY, null);
  if (api) return api;
  const lang = ref<Lang>('en');
  return {
    lang,
    t: (key, vars) => {
      let s: string = TRANSLATIONS.en[key] ?? (key as string);
      if (vars) {
        for (const k in vars) {
          s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(vars[k]));
        }
      }
      return s;
    },
    setLang: () => {},
    cycleLang: () => {},
  };
}
