// Mounting one catalog into a host element: shadow root + styles + Vue app.
import { createApp, h, reactive, type App } from 'vue';
import { PelicanLibertexSocial } from '../src';
import type { Strategy } from '../src/types/strategy';
import type { PelicanError } from '../src/utils/http';
import logoSrc from './assets/logo.webp';
import { applyStyles } from './styles';
import { registerFonts } from './fonts';
import { resolveOptions, type EmbedOptions, type ResolvedOptions } from './options';
import { dispatchHostEvent, pushDataLayer, strategyIdFromHref, type EventName } from './events';
import { startFrameChild, type FrameChild } from './frame';

export const VERSION = __PELICAN_EMBED_VERSION__;

export interface WidgetHandle {
  /** Change options at runtime (lang/theme/blobs/linkParams live; endpoints remount). */
  update(opts: EmbedOptions): void;
  unmount(): void;
}

export type MountMode = 'inline' | 'frame';

interface Instance extends WidgetHandle {
  el: Element;
}

const instances = new Map<Element, Instance>();

export function instanceFor(el: Element): Instance | undefined {
  return instances.get(el);
}

export function liveInstances(): Instance[] {
  return Array.from(instances.values());
}

/** Keys the component reads only once at setup -> changing them needs a remount. */
const REMOUNT_KEYS: ReadonlyArray<keyof ResolvedOptions> = ['apiBase', 'catalogBase', 'locale'];

function shadowFor(el: HTMLElement): ShadowRoot {
  if (el.shadowRoot) return el.shadowRoot;
  try {
    return el.attachShadow({ mode: 'open' });
  } catch {
    // Element type that cannot host a shadow root (e.g. <a>, <ul>): use a child div.
    const div = document.createElement('div');
    el.appendChild(div);
    return div.attachShadow({ mode: 'open' });
  }
}

export function mount(el: HTMLElement, opts: EmbedOptions = {}, mode: MountMode = 'inline'): WidgetHandle {
  const existing = instances.get(el);
  if (existing) {
    existing.update(opts);
    return existing;
  }

  registerFonts();
  let raw: EmbedOptions = { ...opts };
  let cur: ResolvedOptions = resolveOptions(raw);

  const shadow = shadowFor(el);
  applyStyles(shadow);
  const root = document.createElement('div');
  root.className = 'pel-root pel-embed';
  shadow.appendChild(root);

  const frame: FrameChild | null = mode === 'frame' ? startFrameChild(el, root, VERSION) : null;

  const emit = (name: EventName, detail: Record<string, unknown>) => {
    dispatchHostEvent(el, name, detail);
    if (frame) frame.forward(name, detail);
    else if (cur.dataLayer) pushDataLayer(name, detail);
  };

  // Reactive props: lang / theme / linkParams changes re-render in place.
  const props = reactive({
    lang: cur.lang,
    theme: cur.theme,
    linkParams: cur.linkParams,
  });

  let app: App | null = null;
  let mountPoint: HTMLElement | null = null;
  let io: IntersectionObserver | null = null;
  let readyMo: MutationObserver | null = null;
  let readySent = false;

  const syncRootAttrs = () => {
    root.setAttribute('data-blobs', cur.blobs ? 'on' : 'off');
    root.setAttribute('data-theme', cur.theme);
  };
  syncRootAttrs();

  const placeholder = () => {
    mountPoint = document.createElement('div');
    mountPoint.className = 'pel-pending';
    root.appendChild(mountPoint);
  };

  const watchReady = () => {
    if (readySent) return;
    const check = () => {
      if (readySent || !root.querySelector('.pelican-row')) return;
      readySent = true;
      readyMo?.disconnect();
      readyMo = null;
      emit('ready', { version: VERSION, lang: props.lang });
    };
    readyMo = new MutationObserver(check);
    readyMo.observe(root, { childList: true, subtree: true });
    check();
  };

  const start = () => {
    if (app || !mountPoint) return;
    const a = createApp({
      render: () =>
        h(PelicanLibertexSocial, {
          apiBase: cur.apiBase,
          catalogBase: cur.catalogBase,
          locale: cur.locale,
          lang: props.lang,
          theme: props.theme,
          linkParams: props.linkParams,
          logoSrc,
          welcome: false,
          persist: false,
          fetchProgress: false,
          onError: (e: PelicanError) =>
            emit('error', { message: e?.message, code: e?.code, status: e?.status }),
          onSelectStrategy: (s: Strategy) => emit('strategy-open', { strategyId: s.Id, name: s.Name }),
          'onUpdate:lang': (l: string) => {
            props.lang = l as ResolvedOptions['lang'];
          },
          'onUpdate:theme': (t: string) => {
            props.theme = t as ResolvedOptions['theme'];
          },
        }),
    });
    // Never let a widget error surface on the host page as an uncaught error.
    a.config.errorHandler = (err) => {
      try {
        console.error('[LibertexSocialWidget]', err);
      } catch {
        /* no console */
      }
      emit('error', { message: err instanceof Error ? err.message : String(err), code: 'runtime' });
    };
    app = a;
    a.mount(mountPoint);
    mountPoint.className = 'pel-mount';
    watchReady();
  };

  const schedule = () => {
    placeholder();
    if (cur.lazy && mode !== 'frame' && typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            io?.disconnect();
            io = null;
            start();
          }
        },
        { rootMargin: '800px 0px' },
      );
      io.observe(el);
    } else {
      start();
    }
  };

  const stop = () => {
    io?.disconnect();
    io = null;
    readyMo?.disconnect();
    readyMo = null;
    if (app) {
      try {
        app.unmount();
      } catch {
        /* ignore */
      }
    }
    app = null;
    mountPoint?.remove();
    mountPoint = null;
  };

  // Subscribe clicks. Capture phase: the row link calls stopPropagation.
  const onClick = (e: Event) => {
    const t = e.target as Element | null;
    const a = t && typeof t.closest === 'function' ? (t.closest('a[href]') as HTMLAnchorElement | null) : null;
    if (!a) return;
    const id = strategyIdFromHref(a.href);
    if (id != null) emit('subscribe-click', { strategyId: id, href: a.href });
  };
  shadow.addEventListener('click', onClick, true);

  const handle: Instance = {
    el,
    update(next: EmbedOptions) {
      raw = { ...raw, ...next };
      const prev = cur;
      cur = resolveOptions(raw);
      syncRootAttrs();
      // Only touch what changed: keeps the visitor's own lang/theme toggle.
      if (prev.lang !== cur.lang) props.lang = cur.lang;
      if (prev.theme !== cur.theme) props.theme = cur.theme;
      if (prev.linkParams !== cur.linkParams) props.linkParams = cur.linkParams;
      if (app && REMOUNT_KEYS.some((k) => prev[k] !== cur[k])) {
        stop();
        placeholder();
        start();
      }
    },
    unmount() {
      stop();
      shadow.removeEventListener('click', onClick, true);
      root.remove();
      instances.delete(el);
    },
  };
  instances.set(el, handle);
  schedule();
  return handle;
}
