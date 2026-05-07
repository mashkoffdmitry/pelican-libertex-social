import { ref, watch, onScopeDispose, type Ref } from 'vue';
import type { ThemeMode } from '../types/columns';

const STORAGE_KEY = 'pelican-theme';

export interface UseThemeReturn {
  mode: Ref<ThemeMode>;
  resolved: Ref<'dark' | 'light'>;
  setMode(next: ThemeMode): void;
  cycle(): void;
}

export function useTheme(initial: ThemeMode = 'auto'): UseThemeReturn {
  const stored = readStored();
  const mode = ref<ThemeMode>(stored ?? initial);
  const resolved = ref<'dark' | 'light'>('dark');
  const mq = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

  const apply = () => {
    const m = mode.value;
    const next: 'dark' | 'light' =
      m === 'dark' ? 'dark' : m === 'light' ? 'light' : mq?.matches ? 'dark' : 'light';
    resolved.value = next;
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', next);
    }
  };

  const onMq = () => {
    if (mode.value === 'auto') apply();
  };

  if (mq) {
    if (mq.addEventListener) mq.addEventListener('change', onMq);
    else mq.addListener(onMq);
  }

  watch(mode, (m) => {
    try {
      localStorage.setItem(STORAGE_KEY, m);
    } catch {
      /* storage unavailable */
    }
    apply();
  });

  apply();

  onScopeDispose(() => {
    if (mq) {
      if (mq.removeEventListener) mq.removeEventListener('change', onMq);
      else mq.removeListener(onMq);
    }
  });

  function setMode(next: ThemeMode) {
    mode.value = next;
  }
  function cycle() {
    mode.value = mode.value === 'dark' ? 'light' : mode.value === 'light' ? 'auto' : 'dark';
  }

  return { mode, resolved, setMode, cycle };
}

function readStored(): ThemeMode | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'dark' || v === 'light' || v === 'auto') return v;
    return null;
  } catch {
    return null;
  }
}
