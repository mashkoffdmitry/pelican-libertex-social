// Self-hosted Manrope (SIL OFL 1.1, see fonts/OFL.txt), variable wght 200-800,
// same subsets / unicode-ranges as Google Fonts css2 v20.
//
// Browsers ignore @font-face inside a shadow root, so the faces are registered
// ONCE at document level. The family is renamed to 'Pelican Manrope' so it can
// never clash with (or be replaced by) a host page's own 'Manrope'.
// In lib mode Vite inlines these imports as data: URIs -> no extra requests.
import cyrExt from './fonts/manrope-cyrillic-ext.woff2';
import cyr from './fonts/manrope-cyrillic.woff2';
import latExt from './fonts/manrope-latin-ext.woff2';
import lat from './fonts/manrope-latin.woff2';

export const FONT_FAMILY = 'Pelican Manrope';

const FACES: ReadonlyArray<readonly [string, string]> = [
  [cyrExt, 'U+0460-052F,U+1C80-1C8A,U+20B4,U+2DE0-2DFF,U+A640-A69F,U+FE2E-FE2F'],
  [cyr, 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116'],
  [
    latExt,
    'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
  ],
  [
    lat,
    'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  ],
];

const STYLE_ID = 'lsw-fonts';
let registered = false;

function styleFallback(): void {
  if (document.getElementById(STYLE_ID)) return;
  const css = FACES.map(
    ([src, range]) =>
      `@font-face{font-family:'${FONT_FAMILY}';font-style:normal;font-weight:200 800;font-display:swap;` +
      `src:url(${src}) format('woff2');unicode-range:${range}}`,
  ).join('');
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = css;
  (document.head || document.documentElement).appendChild(s);
}

/** Registers the faces on document.fonts (once per page, even across script copies). */
export function registerFonts(): void {
  if (registered) return;
  registered = true;
  try {
    const set = document.fonts as FontFaceSet & { add(f: FontFace): FontFaceSet };
    let already = false;
    set.forEach((f) => {
      if (f.family.replace(/["']/g, '') === FONT_FAMILY) already = true;
    });
    if (already || document.getElementById(STYLE_ID)) return;
    for (const [src, unicodeRange] of FACES) {
      set.add(
        new FontFace(FONT_FAMILY, `url(${src}) format('woff2')`, {
          style: 'normal',
          weight: '200 800',
          display: 'swap',
          unicodeRange,
        }),
      );
    }
  } catch {
    styleFallback();
  }
}
