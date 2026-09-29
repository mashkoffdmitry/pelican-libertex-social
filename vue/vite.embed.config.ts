// SECOND build: the self-contained embeddable widget for third-party pages
// (libertex.org, fxclub.org) served from a static bucket/CDN.
//
//   npm run build:embed   ->  dist-embed/{pelican-widget.js, frame.html, demo.html, ...}
//
// Independent of vite.config.ts: own entry (embed/main.ts), own outDir; the
// default `vite build` (npm lib + the proxy's /widget/ files) is unchanged.
// Build-time env: PELICAN_API_BASE, PELICAN_CATALOG_BASE (default endpoints),
// CI_COMMIT_SHORT_SHA / GITHUB_SHA (build id in LibertexSocialWidget.version).
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pelicanEmbed } from './embed/build/plugin';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const readJson = (p: string) => JSON.parse(readFileSync(resolve(__dirname, p), 'utf8'));

function httpsOrigin(name: string, fallback: string): string {
  const v = (process.env[name] || fallback).trim().replace(/\/+$/, '');
  let u: URL;
  try {
    u = new URL(v);
  } catch {
    throw new Error(`${name} must be an absolute https URL, got "${v}"`);
  }
  if (u.protocol !== 'https:') throw new Error(`${name} must be https, got "${v}"`);
  return v;
}

const API_BASE = httpsOrigin('PELICAN_API_BASE', 'https://labs-pelican-proxy.mctl.ai');
const CATALOG_BASE = httpsOrigin(
  'PELICAN_CATALOG_BASE',
  'https://pelican-catalog-worker.pelican-libertex.workers.dev',
);
if (API_BASE === CATALOG_BASE) {
  throw new Error('PELICAN_CATALOG_BASE must differ from PELICAN_API_BASE');
}

// Root package.json version = the S3 folder name in the corp pipeline.
const sha = (process.env.CI_COMMIT_SHORT_SHA || (process.env.GITHUB_SHA || '').slice(0, 8)).trim();
const VERSION = String(readJson('../package.json').version) + (sha ? '+' + sha : '');
const COMPONENT_VERSION = String(readJson('./package.json').version);

export default defineConfig({
  plugins: [
    vue(),
    pelicanEmbed({
      apiBase: API_BASE,
      catalogBase: CATALOG_BASE,
      version: VERSION,
      embedDir: resolve(__dirname, 'embed'),
    }),
  ],
  // demo.html + demo-hosts/ (QA only) are copied as is.
  publicDir: resolve(__dirname, 'embed/static'),
  // Pure-ASCII output: immune to pages / S3 objects served without charset.
  esbuild: { charset: 'ascii' },
  define: {
    // lib mode does not replace process.env.* — Vue's esm-bundler build needs it.
    'process.env.NODE_ENV': JSON.stringify('production'),
    __PELICAN_EMBED_VERSION__: JSON.stringify(VERSION),
    __PELICAN_COMPONENT_VERSION__: JSON.stringify(COMPONENT_VERSION),
    __PELICAN_API_BASE__: JSON.stringify(API_BASE),
    __PELICAN_CATALOG_BASE__: JSON.stringify(CATALOG_BASE),
  },
  build: {
    outDir: 'dist-embed',
    emptyOutDir: true,
    cssCodeSplit: false,
    sourcemap: false,
    target: 'es2019',
    minify: 'esbuild',
    // .js (not .iife.js / .cjs): the corp pipeline banners *.js and S3 maps
    // the MIME type from the extension.
    lib: {
      entry: resolve(__dirname, 'embed/main.ts'),
      name: 'LibertexSocialWidgetBundle',
      formats: ['iife'],
      fileName: () => 'pelican-widget.js',
    },
    rollupOptions: {
      external: [], // Vue is BUNDLED here (external in the lib build)
    },
  },
});
