// Build-time post-processing for the embeddable widget (vite.embed.config.ts).
// Runs in generateBundle on the MINIFIED component CSS.
//
// Tolerant by design: an ordinary component CSS change (a new @media block, a
// removed font import, ...) must not break this build. It only FAILS on what
// would visibly break the widget on a host page:
//   - the compact / card-row layout breakpoints can no longer be retargeted
//     (the Subscribe column would be cut), or
//   - a root-absolute url(/...), a Google Fonts reference or an undefined
//     custom property would reach the bundle (see the final gates).
// Everything else that deviates from the known component shape is a warning.
import type { Plugin } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

export interface EmbedPluginOptions {
  apiBase: string;
  catalogBase: string;
  version: string;
  /** vue/embed directory */
  embedDir: string;
}

const PLACEHOLDER = '__PELICAN_EMBED_COMPONENT_CSS__';
/** Container width below which the filters go behind the "Filters" button:
 *  320 filters + 24 gap + 56 padding + 1022 row + 2 table border = 1424. */
const COMPACT_MAX = 1423;
/** Below 1072 px the row cannot fit at all: switch to the card rows the
 *  component otherwise uses on phones (<= 720 px). */
const CARDS_MAX = 1071;
/** Only layout-level breakpoints are retargeted; narrower blocks are phone
 *  tweaks and keep their width (as container queries). */
const RETARGET_MIN_ORIGINAL = 600;
/** Custom properties the component sets inline from JS (not in any CSS). */
const INLINE_VARS = ['lo', 'hi', 'fill'];
/** Selectors whose blocks make the layout "compact" (one column, filters
 *  behind the Filters button). Every one must be retargeted. */
const COMPACT_MARKERS = ['.pelican-main[', '.pelican-filters[', '.filters-toggle['];
/** Selectors whose blocks switch rows to vertical cards and hide the head. */
const CARDS_MARKERS = ['.pelican-row[', '.row.head['];

type Fail = (msg: string) => never;
type Warn = (msg: string) => void;

function replaceAll(css: string, re: RegExp, to: string): { css: string; n: number } {
  let n = 0;
  const out = css.replace(re, () => {
    n++;
    return to;
  });
  return { css: out, n };
}

/** Index just past the '}' closing the block whose '{' ends right before `from`. */
function blockEnd(css: string, from: number): number {
  let depth = 1;
  let j = from;
  while (depth && j < css.length) {
    if (css[j] === '{') depth++;
    else if (css[j] === '}') depth--;
    j++;
  }
  return j;
}

interface MediaBlock {
  start: number;
  end: number;
  /** Full block text including the braces. */
  text: string;
  /** Just `max-width:Npx` (single-condition block), else null. */
  maxWidth: number | null;
}

/** Width-only `@media (max|min-width:Npx) [and (...)] {...}` blocks (balanced
 *  braces). Other media queries (prefers-*, print, ...) stay untouched. */
function mediaBlocks(css: string): MediaBlock[] {
  const cond = String.raw`\(\s*(?:max|min)-width\s*:\s*\d+px\s*\)`;
  const re = new RegExp(String.raw`@media\s*(${cond}(?:\s*and\s*${cond})*)\s*\{`, 'g');
  const out: MediaBlock[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    const j = blockEnd(css, m.index + m[0].length);
    const single = /^\(\s*max-width\s*:\s*(\d+)px\s*\)$/.exec(m[1].trim());
    out.push({ start: m.index, end: j, text: css.slice(m.index, j), maxWidth: single ? Number(single[1]) : null });
    re.lastIndex = j;
  }
  return out;
}

export function postprocessComponentCss(input: string, fail: Fail, warn: Warn = () => {}): string {
  let css = input;
  let r: { css: string; n: number };

  // 1) Google Fonts @import: inside a shadow root @font-face is ignored, and the
  //    font is self-hosted anyway (no third-party request). Must go FIRST: its
  //    URL contains "family=Manrope" too.
  r = replaceAll(css, /@import\s*(?:url\(\s*)?["']https:\/\/fonts\.googleapis\.com\/[^"']*["']\s*\)?\s*;?/g, '');
  css = r.css;
  if (r.n !== 1) warn(`Google Fonts @import: expected 1, removed ${r.n}`);

  // 2) Root-absolute blob images would resolve against the HOST origin.
  //    embed.css sets the bundled WebP instead. (Any other url(/...) fails the
  //    final gate.)
  r = replaceAll(css, /url\(\s*["']?\/bg-blob2?\.png["']?\s*\)/g, 'none');
  css = r.css;
  if (r.n !== 2) warn(`url(/bg-blob*.png): expected 2, replaced ${r.n}`);

  // 3) Family rename (index.css root font + WelcomeModal) -> the self-hosted
  //    face registered by embed/fonts.ts.
  r = replaceAll(css, /(["']?)(?<![\w-])Manrope(?![\w-])\1/g, "'Pelican Manrope'");
  css = r.css;
  if (r.n < 1) warn('no Manrope font-family token found: the component font changed?');

  // 4) Viewport breakpoints -> container breakpoints (container = .pel-root),
  //    except the full-screen welcome modal (really viewport-sized).
  // 5) Retarget layout breakpoints so the Subscribe column is never cut (the
  //    original page cuts it at viewport widths 721-1423 px):
  //    - blocks that make the layout "compact" -> COMPACT_MAX: next to the
  //      filters the row needs 1424 px;
  //    - "card rows" blocks (row as a vertical list, table head hidden) ->
  //      CARDS_MAX: even without filters the row needs 1022 px + 2 px border
  //      + 2 x 24 px padding = 1072 px.
  //    Other blocks (e.g. expanded-row details at 1024 px, phone tweaks)
  //    keep their width.
  const blocks = mediaBlocks(css);
  const seen = new Set<string>();
  let out = '';
  let pos = 0;
  for (const b of blocks) {
    out += css.slice(pos, b.start);
    pos = b.end;
    if (b.text.includes('.welcome-')) {
      out += b.text;
      continue;
    }
    let text = b.text.replace(/^@media/, '@container');
    const compact = COMPACT_MARKERS.filter((mk) => text.includes(mk));
    const cards = CARDS_MARKERS.filter((mk) => text.includes(mk));
    if (b.maxWidth != null && b.maxWidth >= RETARGET_MIN_ORIGINAL && (compact.length || cards.length)) {
      if (compact.length && cards.length) {
        fail(`a @media (max-width:${b.maxWidth}px) block mixes compact and card-row selectors`);
      }
      const to = compact.length ? COMPACT_MAX : CARDS_MAX;
      text = text.replace(/max-width\s*:\s*\d+px/, `max-width:${to}px`);
      for (const mk of [...compact, ...cards]) seen.add(mk);
    }
    out += text;
  }
  out += css.slice(pos);
  css = out;

  const missing = [...COMPACT_MARKERS, ...CARDS_MARKERS].filter((mk) => !seen.has(mk));
  if (missing.length) {
    fail(
      `layout breakpoint not found for ${missing.join(', ')}: the compact / card-row ` +
        '@media (max-width) blocks changed — update COMPACT_MARKERS / CARDS_MARKERS',
    );
  }
  // Any width @media left over (other than the welcome modal) still reacts to
  // the host VIEWPORT, not to the widget width.
  for (const m of css.matchAll(/@media([^{]*)\{/g)) {
    if (!/width/.test(m[1])) continue;
    const start = m.index ?? 0;
    const end = blockEnd(css, start + m[0].length);
    if (!css.slice(start, end).includes('.welcome-')) {
      warn(`@media${m[1]} was not converted to @container (unsupported condition)`);
    }
  }

  return css;
}

/** Every var(--x) must be defined somewhere: all:initial does not reset custom
 *  properties, so an undefined one would inherit from the host page's :root. */
export function checkCustomProperties(css: string, js: string, fail: Fail): void {
  const defined = new Set<string>(INLINE_VARS);
  for (const m of css.matchAll(/--([\w-]+)\s*:/g)) defined.add(m[1]);
  const used = new Set<string>();
  for (const src of [css, js]) for (const m of src.matchAll(/var\(\s*--([\w-]+)/g)) used.add(m[1]);
  const missing = [...used].filter((v) => !defined.has(v));
  if (missing.length) fail(`custom properties used but never defined: --${missing.join(', --')}`);
}

/** JSON string literal with every non-ASCII char escaped (pure-ASCII JS). */
export function asciiJson(s: string): string {
  return JSON.stringify(s).replace(/[^\x00-\x7e]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
}

function frameHtml(o: EmbedPluginOptions): string {
  const connect = Array.from(new Set([new URL(o.apiBase).origin, new URL(o.catalogBase).origin])).join(' ');
  const csp = [
    "default-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    'img-src data: https://assets.copy-trade.io',
    'font-src data:',
    `connect-src ${connect}`,
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Libertex Social</title>
<link rel="icon" href="data:,">
<style>html,body{margin:0;padding:0}html.pl-auto,html.pl-auto body{overflow:hidden}</style>
</head>
<body>
<!-- Libertex Social catalog, iframe fallback. Query params: lang, theme, blobs, locale, utm_*. Build ${o.version} -->
<div data-libertex-social-catalog data-mode="frame"></div>
<script src="./pelican-widget.js"></script>
</body>
</html>
`;
}

export function pelicanEmbed(o: EmbedPluginOptions): Plugin {
  return {
    name: 'pelican-embed',
    apply: 'build',
    enforce: 'post',
    generateBundle(_opts, bundle) {
      const fail: Fail = (msg) => this.error('[pelican-embed] ' + msg);

      const cssKeys = Object.keys(bundle).filter((k) => k.endsWith('.css'));
      if (cssKeys.length !== 1) fail(`expected exactly 1 extracted CSS asset, found ${cssKeys.length}`);
      const cssAsset = bundle[cssKeys[0]];
      if (cssAsset.type !== 'asset') fail('CSS output is not an asset');
      const rawCss = String((cssAsset as { source: string | Uint8Array }).source);
      delete bundle[cssKeys[0]];

      const css = postprocessComponentCss(rawCss, fail, (msg) => this.warn('[pelican-embed] ' + msg));

      const chunks = Object.values(bundle).filter((c) => c.type === 'chunk');
      if (chunks.length !== 1) fail(`expected exactly 1 JS chunk, found ${chunks.length}`);
      const chunk = chunks[0] as { code: string; fileName: string };
      if (chunk.fileName !== 'pelican-widget.js') fail(`unexpected chunk name ${chunk.fileName}`);

      checkCustomProperties(css, chunk.code, fail);

      const ph = new RegExp(`(["'\`])${PLACEHOLDER}\\1`, 'g');
      const hits = chunk.code.match(ph)?.length ?? 0;
      if (hits !== 1) fail(`CSS placeholder: expected exactly 1, found ${hits}`);
      const lit = asciiJson(css);
      chunk.code = chunk.code.replace(ph, () => lit);

      this.emitFile({ type: 'asset', fileName: 'frame.html', source: frameHtml(o) });
      this.emitFile({
        type: 'asset',
        fileName: 'OFL-Manrope.txt',
        source: readFileSync(resolve(o.embedDir, 'fonts/OFL.txt')),
      });

      // Final gate over everything that goes to S3.
      for (const f of Object.values(bundle)) {
        const text = f.type === 'chunk' ? f.code : typeof f.source === 'string' ? f.source : null;
        if (text == null) continue;
        for (const bad of ['url(/', 'fonts.googleapis', 'process.env', '__PELICAN_']) {
          if (text.includes(bad)) fail(`"${bad}" found in ${f.fileName}`);
        }
      }
      if (/[^\x00-\x7e]/.test(chunk.code)) fail('pelican-widget.js is not pure ASCII');
    },
    writeBundle(opts, bundle) {
      const js = bundle['pelican-widget.js'];
      if (js && js.type === 'chunk') {
        const raw = Buffer.byteLength(js.code);
        const gz = gzipSync(js.code, { level: 9 }).length;
        this.info?.(`pelican-widget.js ${(raw / 1024).toFixed(1)} KiB, gzip ${(gz / 1024).toFixed(1)} KiB -> ${opts.dir}`);
      }
    },
  };
}
