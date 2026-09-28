// Build-time post-processing for the embeddable widget (vite.embed.config.ts).
// Runs in generateBundle on the MINIFIED component CSS and fails the build if
// any rewrite does not match exactly the expected number of times — a changed
// component must be looked at, not silently shipped half-rewritten.
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
/** Custom properties the component sets inline from JS (not in any CSS). */
const INLINE_VARS = ['lo', 'hi', 'fill'];

type Fail = (msg: string) => never;

function replaceCounted(css: string, re: RegExp, to: string, expected: number, what: string, fail: Fail): string {
  let n = 0;
  const out = css.replace(re, () => {
    n++;
    return to;
  });
  if (n !== expected) fail(`${what}: expected exactly ${expected} match(es), found ${n}`);
  return out;
}

/** Splits `@media (max-width:Npx){...}` blocks (balanced braces). */
function mediaBlocks(css: string): Array<{ start: number; end: number; text: string }> {
  const re = /@media\s*\(\s*max-width\s*:\s*\d+px\s*\)\s*\{/g;
  const out: Array<{ start: number; end: number; text: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    let depth = 1;
    let j = m.index + m[0].length;
    while (depth && j < css.length) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') depth--;
      j++;
    }
    out.push({ start: m.index, end: j, text: css.slice(m.index, j) });
    re.lastIndex = j;
  }
  return out;
}

export function postprocessComponentCss(input: string, fail: Fail): string {
  let css = input;

  // 1) Google Fonts @import: inside a shadow root @font-face is ignored, and the
  //    font is self-hosted anyway (no third-party request). Must go FIRST: its
  //    URL contains "family=Manrope" too.
  css = replaceCounted(
    css,
    /@import\s*(?:url\(\s*)?["']https:\/\/fonts\.googleapis\.com\/[^"']*["']\s*\)?\s*;?/g,
    '',
    1,
    'Google Fonts @import',
    fail,
  );

  // 2) Root-absolute blob images would resolve against the HOST origin.
  //    embed.css sets the bundled WebP instead.
  css = replaceCounted(css, /url\(\s*["']?\/bg-blob2?\.png["']?\s*\)/g, 'none', 2, 'url(/bg-blob*.png)', fail);

  // 3) Family rename (index.css root font + WelcomeModal).
  css = replaceCounted(
    css,
    /(["']?)(?<![\w-])Manrope(?![\w-])\1/g,
    "'Pelican Manrope'",
    2,
    'Manrope font-family token',
    fail,
  );

  // 4) Viewport breakpoints -> container breakpoints (container = .pel-root),
  //    except the full-screen welcome modal (really viewport-sized).
  const blocks = mediaBlocks(css);
  if (blocks.length !== 7) fail(`@media (max-width) blocks: expected 7, found ${blocks.length}`);
  const modal = blocks.filter((b) => b.text.includes('.welcome-'));
  if (modal.length !== 1) fail(`welcome-modal @media blocks: expected 1, found ${modal.length}`);

  // 5) Retarget breakpoints so the Subscribe column is never cut (the original
  //    page cuts it at viewport widths 721-1423 px):
  //    - the three blocks that make the layout "compact" (one column, filters
  //      behind the Filters button) -> COMPACT_MAX: next to the filters the
  //      row needs 1424 px;
  //    - the two "card rows" blocks (row as a vertical list, table head
  //      hidden) -> CARDS_MAX: even without filters the row needs 1022 px +
  //      2 px border + 2 x 24 px padding = 1072 px.
  //    The remaining block (expanded-row details, 1024 px) keeps its value.
  const COMPACT_MARKERS = ['.pelican-main[', '.pelican-filters[', '.filters-toggle['];
  const CARDS_MARKERS = ['.pelican-row[', '.row.head['];
  let compact = 0;
  let cards = 0;
  let converted = 0;
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
    converted++;
    const isCompact = COMPACT_MARKERS.some((mk) => text.includes(mk));
    const isCards = CARDS_MARKERS.some((mk) => text.includes(mk));
    if (isCompact && isCards) fail('a @media block matches both compact and card-row markers');
    if (isCompact) {
      text = text.replace(/max-width\s*:\s*\d+px/, `max-width:${COMPACT_MAX}px`);
      compact++;
    } else if (isCards) {
      text = text.replace(/max-width\s*:\s*\d+px/, `max-width:${CARDS_MAX}px`);
      cards++;
    }
    out += text;
  }
  out += css.slice(pos);
  css = out;
  if (converted !== 6) fail(`@media -> @container: expected 6 blocks, converted ${converted}`);
  if (compact !== 3) fail(`compact breakpoint retarget: expected 3 blocks, found ${compact}`);
  if (cards !== 2) fail(`card-rows breakpoint retarget: expected 2 blocks, found ${cards}`);

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

      const css = postprocessComponentCss(rawCss, fail);

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
