// Entry of the self-contained embeddable widget (pelican-widget.js, IIFE).
// Bundles Vue + the component + CSS + fonts + images into one classic script.
//
//   <div data-libertex-social-catalog data-lang="en" data-theme="dark"></div>
//   <script src="https://<cdn>/latest/pelican-widget.js" defer></script>
//
// or <libertex-social-catalog lang="ru"></libertex-social-catalog>, or
// LibertexSocialWidget.mount(el, {lang: 'ru'}) -> {update, unmount}.
// See embed/README.md.
import { mount, instanceFor, liveInstances, VERSION, type MountMode, type WidgetHandle } from './widget';
import { ATTRS, optionsFromElement, optionsFromQuery, type EmbedOptions } from './options';
import { initFrameParent } from './frame';

// Captured synchronously at top level: document.currentScript is null later
// (and under Cloudflare Rocket Loader); fall back to a lookup by file name.
const CURRENT_SCRIPT: HTMLScriptElement | null = (() => {
  try {
    const cs = document.currentScript as HTMLScriptElement | null;
    if (cs && cs.src) return cs;
    const all = document.querySelectorAll<HTMLScriptElement>('script[src*="pelican-widget.js"]');
    return all.length ? all[all.length - 1] : null;
  } catch {
    return null;
  }
})();

const SELECTOR = '[data-libertex-social-catalog]';
const TAG = 'libertex-social-catalog';

export interface LibertexSocialWidgetApi {
  version: string;
  componentVersion: string;
  mount(el: HTMLElement, opts?: EmbedOptions): WidgetHandle;
  scan(root?: ParentNode): void;
  __pelican: true;
}

function scriptOrigin(): string | null {
  try {
    return CURRENT_SCRIPT ? new URL(CURRENT_SCRIPT.src, location.href).origin : null;
  } catch {
    return null;
  }
}

function mountElement(el: HTMLElement): void {
  if (instanceFor(el)) return;
  const mode: MountMode = el.getAttribute('data-mode') === 'frame' ? 'frame' : 'inline';
  const opts = mode === 'frame' ? optionsFromQuery(location.search) : optionsFromElement(el);
  mount(el, opts, mode);
}

function scan(root: ParentNode = document): void {
  if (root instanceof HTMLElement && root.matches(SELECTOR)) mountElement(root);
  root.querySelectorAll<HTMLElement>(SELECTOR).forEach(mountElement);
}

/** Unmount instances whose element left the DOM (checked after a microtask,
 *  so a node that is only being moved keeps its widget). */
function sweep(): void {
  Promise.resolve().then(() => {
    for (const inst of liveInstances()) if (!inst.el.isConnected) inst.unmount();
  });
}

function defineElement(): void {
  if (typeof customElements === 'undefined' || customElements.get(TAG)) return;
  class LibertexSocialCatalogElement extends HTMLElement {
    static get observedAttributes() {
      return ATTRS.flatMap((a) => [a, 'data-' + a]);
    }
    connectedCallback() {
      if (!instanceFor(this)) mount(this, optionsFromElement(this));
    }
    disconnectedCallback() {
      Promise.resolve().then(() => {
        if (!this.isConnected) instanceFor(this)?.unmount();
      });
    }
    attributeChangedCallback() {
      instanceFor(this)?.update(optionsFromElement(this));
    }
  }
  customElements.define(TAG, LibertexSocialCatalogElement);
}

function init(): void {
  const api: LibertexSocialWidgetApi = {
    version: VERSION,
    componentVersion: __PELICAN_COMPONENT_VERSION__,
    mount: (el, opts) => mount(el, opts),
    scan,
    __pelican: true,
  };
  (window as unknown as { LibertexSocialWidget: LibertexSocialWidgetApi }).LibertexSocialWidget = api;

  defineElement();
  initFrameParent(scriptOrigin(), VERSION);

  const boot = () => {
    scan();
    if (typeof MutationObserver === 'undefined') return;
    new MutationObserver((records) => {
      let removed = false;
      for (const r of records) {
        r.addedNodes.forEach((n) => {
          if (n.nodeType === 1) scan(n as HTMLElement);
        });
        if (r.removedNodes.length) removed = true;
      }
      if (removed) sweep();
    }).observe(document.documentElement, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}

// Guard against the script being included twice (e.g. snippet + theme library,
// or /latest/ and /<version>/ on one page): the first copy stays in charge.
const existing = (window as unknown as { LibertexSocialWidget?: Partial<LibertexSocialWidgetApi> })
  .LibertexSocialWidget;
if (existing && existing.__pelican) {
  try {
    existing.scan?.();
  } catch {
    /* ignore */
  }
} else {
  init();
}
