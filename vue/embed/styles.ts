// Puts the widget CSS into a shadow root: one shared constructable stylesheet
// (adoptedStyleSheets, not subject to the host's CSP style-src) with a <style>
// fallback for older browsers.
import embedCss from './embed.css?inline';

// Replaced at build time (embed/build/plugin.ts, generateBundle) with the
// post-processed, minified component CSS (styles/index.css + every scoped SFC
// <style>) as a pure-ASCII JS string. The build fails if it is not replaced.
const COMPONENT_CSS: string = '__PELICAN_EMBED_COMPONENT_CSS__';

/** Component CSS first, the embed layer last (it wins equal-specificity ties). */
// (join, not '+': the minifier must not fold the placeholder into another literal)
export const WIDGET_CSS = [COMPONENT_CSS, embedCss].join('\n');

let shared: CSSStyleSheet | null | undefined;
const styled = new WeakSet<ShadowRoot>();

function sharedSheet(): CSSStyleSheet | null {
  if (shared !== undefined) return shared;
  shared = null;
  try {
    if ('adoptedStyleSheets' in Document.prototype && 'replaceSync' in CSSStyleSheet.prototype) {
      const s = new CSSStyleSheet();
      s.replaceSync(WIDGET_CSS);
      shared = s;
    }
  } catch {
    shared = null;
  }
  return shared;
}

/** Idempotent: styles are added only once per shadow root. */
export function applyStyles(root: ShadowRoot): void {
  if (styled.has(root)) return;
  styled.add(root);
  const sheet = sharedSheet();
  if (sheet) {
    try {
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
      return;
    } catch {
      /* fall through to <style> */
    }
  }
  const style = document.createElement('style');
  style.textContent = WIDGET_CSS;
  root.appendChild(style);
}
