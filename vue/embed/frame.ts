// iframe fallback (frame.html) — both sides live in pelican-widget.js.
//
//  child (inside frame.html)            parent (host page, same script)
//  ---------------------------------    ---------------------------------
//  'ready'  -> parent, retried at        on 'ready': reply 'hello' to that
//  0/0.5/1.5/3.5/7.5/15 s until hello    iframe (+ proactive hello on load)
//  after hello: 'height' via             sets iframe height (0..50000 px)
//  ResizeObserver, 'event' forwarding    re-dispatches events on the iframe
//                                        element + window.dataLayer
//
// Without the parent helper the iframe keeps its own height (inner scroll).
import { dispatchHostEvent, pushDataLayer, EVENT_NAMES, type EventName } from './events';

const P = 'libertex-social:';
const T_READY = P + 'ready';
const T_HELLO = P + 'hello';
const T_HEIGHT = P + 'height';
const T_EVENT = P + 'event';
const RETRIES_MS = [0, 500, 1500, 3500, 7500, 15000];
const MAX_HEIGHT = 50000;

interface Msg {
  type?: unknown;
  height?: unknown;
  name?: unknown;
  detail?: unknown;
}

// ---------------------------------------------------------------- child ----

export interface FrameChild {
  forward(name: EventName, detail: Record<string, unknown>): void;
}

export function startFrameChild(hostEl: HTMLElement, root: HTMLElement, version: string): FrameChild {
  root.setAttribute('data-frame', 'fixed');
  const parent = window.parent;
  if (!parent || parent === window) return { forward() {} };

  let parentOrigin: string | null = null;
  const queue: Array<[EventName, Record<string, unknown>]> = [];
  const timers: number[] = [];
  let lastHeight = -1;
  let raf = 0;

  const post = (msg: Record<string, unknown>, origin: string) => {
    try {
      parent.postMessage(msg, origin);
    } catch {
      /* detached */
    }
  };

  const sendHeight = () => {
    raf = 0;
    if (!parentOrigin) return;
    const h = Math.ceil(hostEl.getBoundingClientRect().height);
    if (h === lastHeight) return;
    lastHeight = h;
    post({ type: T_HEIGHT, height: h }, parentOrigin);
  };
  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(sendHeight);
  };

  window.addEventListener('message', (e: MessageEvent) => {
    if (e.source !== parent) return;
    const d = e.data as Msg | null;
    if (!d || d.type !== T_HELLO) return;
    const first = !parentOrigin;
    parentOrigin = e.origin;
    timers.forEach(clearTimeout);
    if (first) {
      document.documentElement.classList.add('pl-auto');
      root.setAttribute('data-frame', 'auto');
      if (typeof ResizeObserver !== 'undefined') new ResizeObserver(schedule).observe(hostEl);
      else window.addEventListener('resize', schedule);
      queue.splice(0).forEach(([n, det]) => post({ type: T_EVENT, name: n, detail: det }, parentOrigin as string));
    }
    lastHeight = -1;
    schedule();
  });

  // Nothing secret in 'ready', and the parent's origin is unknown until hello.
  for (const ms of RETRIES_MS) {
    timers.push(
      window.setTimeout(() => {
        if (!parentOrigin) post({ type: T_READY, version }, '*');
      }, ms),
    );
  }

  return {
    forward(name, detail) {
      if (parentOrigin) post({ type: T_EVENT, name, detail }, parentOrigin);
      else if (queue.length < 20) queue.push([name, detail]);
    },
  };
}

// --------------------------------------------------------------- parent ----

function frameOrigin(f: HTMLIFrameElement): string | null {
  try {
    return new URL(f.getAttribute('src') || f.src, location.href).origin;
  } catch {
    return null;
  }
}

/** iframe[data-libertex-social-frame], or (if a CMS stripped the attribute) an
 *  iframe whose src is .../frame.html on the same origin as this script. */
function isOurFrame(f: HTMLIFrameElement, scriptOrigin: string | null): boolean {
  if (f.hasAttribute('data-libertex-social-frame')) return true;
  if (!scriptOrigin) return false;
  try {
    const u = new URL(f.getAttribute('src') || f.src, location.href);
    return u.origin === scriptOrigin && /\/frame\.html$/.test(u.pathname);
  } catch {
    return false;
  }
}

function findFrames(scriptOrigin: string | null): HTMLIFrameElement[] {
  return Array.from(document.getElementsByTagName('iframe')).filter((f) => isOurFrame(f, scriptOrigin));
}

export function initFrameParent(scriptOrigin: string | null, version: string): void {
  const hello = (f: HTMLIFrameElement) => {
    const origin = frameOrigin(f);
    if (!origin || !f.contentWindow) return;
    try {
      // targetOrigin: dropped silently while the frame is still about:blank
      f.contentWindow.postMessage({ type: T_HELLO, version }, origin);
    } catch {
      /* ignore */
    }
  };

  window.addEventListener('message', (e: MessageEvent) => {
    const d = e.data as Msg | null;
    if (!d || typeof d.type !== 'string' || d.type.indexOf(P) !== 0) return;
    const frame = Array.from(document.getElementsByTagName('iframe')).find((f) => f.contentWindow === e.source);
    if (!frame || !isOurFrame(frame, scriptOrigin) || e.origin !== frameOrigin(frame)) return;

    if (d.type === T_READY) {
      hello(frame);
    } else if (d.type === T_HEIGHT) {
      const h = Number(d.height);
      if (!isFinite(h)) return;
      frame.style.height = Math.max(0, Math.min(MAX_HEIGHT, Math.ceil(h))) + 'px';
    } else if (d.type === T_EVENT) {
      const name = d.name as EventName;
      if (!EVENT_NAMES.includes(name)) return;
      const detail = d.detail && typeof d.detail === 'object' ? (d.detail as Record<string, unknown>) : {};
      dispatchHostEvent(frame, name, detail);
      if (frame.getAttribute('data-datalayer') !== 'off') pushDataLayer(name, detail);
    }
  });

  // The helper may load after the frame already gave up retrying.
  findFrames(scriptOrigin).forEach(hello);
}
