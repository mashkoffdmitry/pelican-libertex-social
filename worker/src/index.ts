// Cloudflare Worker that fronts the pelican catalog R2 bucket.
//
// Read endpoints (cached at the edge for 1h):
//   GET  /api/strategies-full           → strategies-enabled.json from R2: a bare
//                                         Strategy[] with IsEnabled=false rows
//                                         dropped — the SAME contract the
//                                         pelican-proxy exposes on that path, so
//                                         browsers / @mashkovd/pelican-vue can point
//                                         `catalogBase` here without a shape change.
//   GET  /api/strategies-full?raw=1     → strategies-full.json from R2: the raw
//                                         `{ at, items }` envelope with ALL rows.
//                                         Used by pelican-proxy's cold-start seed,
//                                         which needs the disabled rows too.
//   GET  /api/strategies-full?download=1 → same body, plus Content-Disposition so a
//                                         browser saves it as a file instead of
//                                         rendering it. Combinable with raw=1.
//   GET  /api/strategies-full/progress  → progress.json from R2
//
// Write endpoint:
//   POST /__ingest                      → pelican-proxy pushes a fresh catalog here
//                                         (validates X-Ingest-Secret against
//                                         INGEST_SECRET binding)
//
// Why R2 stores RAW JSON (not gzip): Cloudflare's edge auto-compresses Worker
// responses for compressible content types when the client sends
// `Accept-Encoding: gzip`. If we stored gzipped bytes and set
// `Content-Encoding: gzip`, CF would double-encode (gzip-of-gzip) on egress.
// Raw storage is simple and R2 reads are cheap.

export interface Env {
  CATALOG: R2Bucket;
  INGEST_SECRET: string;
}

const CATALOG_KEY = 'strategies-full.json';
const ENABLED_KEY = 'strategies-enabled.json';
const PROGRESS_KEY = 'progress.json';

interface CatalogItem { IsEnabled?: boolean | null; [k: string]: unknown }
interface CatalogEnvelope { at?: number; items?: CatalogItem[] }

// Mirrors pelican-proxy's `onlyEnabled` filter on /api/strategies-full.
const onlyEnabled = (items: CatalogItem[]) => items.filter((s) => s && s.IsEnabled !== false);

// Persist the browser-facing copy + progress.json. `loaded`/`total` are the
// ENABLED count — that's what the widget shows in "Showing N of TOTAL" and
// what /api/strategies-full actually returns; the raw envelope's row count
// (incl. disabled) is an internal detail of the proxy's rebuild.
async function storeEnabled(env: Env, enabled: CatalogItem[], builtAt: number): Promise<void> {
  await env.CATALOG.put(ENABLED_KEY, JSON.stringify(enabled), {
    httpMetadata: { contentType: 'application/json', cacheControl: 'public, max-age=3600' },
    customMetadata: { size: String(enabled.length), builtAt: String(builtAt) },
  });
  const progress = JSON.stringify({
    ready: true,
    building: false,
    loaded: enabled.length,
    total: enabled.length,
    built_at: builtAt,
  });
  await env.CATALOG.put(PROGRESS_KEY, progress, {
    httpMetadata: { contentType: 'application/json' },
  });
}

// Content-Disposition for `?download=1`, so a plain browser link saves the
// catalog as a file instead of rendering 3.4 MB of JSON in a tab. The date comes
// from the catalog's own build timestamp, so two downloads of the same build get
// the same filename. Kept ASCII-only — no user input reaches this value.
function downloadHeaders(builtAt: number | null, raw: boolean): Record<string, string> {
  const ts = builtAt && Number.isFinite(builtAt) ? new Date(builtAt) : new Date();
  const day = ts.toISOString().slice(0, 10);
  const name = `libertex-strategies${raw ? '-full' : ''}-${day}.json`;
  return { 'content-disposition': `attachment; filename="${name}"` };
}

const baseCors: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type, x-ingest-secret, content-encoding',
  // Without this, a cross-origin page can only read the CORS-safelisted response
  // headers (cache-control, content-type, last-modified, ...) — so an embedder
  // fetching the catalog from its own site got `null` for every x-catalog-* header
  // and had no way to tell how fresh the data was without parsing the body.
  'access-control-expose-headers':
    'x-catalog-size, x-catalog-built-at, x-catalog-derived, etag',
};

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: baseCors });
    }

    if (req.method === 'GET' && url.pathname === '/api/strategies-full') {
      const download = url.searchParams.get('download') === '1';
      return url.searchParams.get('raw') === '1'
        ? serveRawCatalog(env, download)
        : serveEnabledCatalog(env, download);
    }
    if (req.method === 'GET' && url.pathname === '/api/strategies-full/progress') {
      return serveProgress(env);
    }
    if (req.method === 'POST' && url.pathname === '/__ingest') {
      return ingest(req, env);
    }
    if (req.method === 'GET' && url.pathname === '/healthz') {
      return new Response('ok', { headers: { ...baseCors, 'content-type': 'text/plain' } });
    }
    if (req.method === 'GET' && url.pathname === '/') {
      return new Response(
        JSON.stringify({
          name: 'pelican-catalog-worker',
          description: 'Edge-cached Libertex strategies catalog backed by R2.',
          endpoints: ['/api/strategies-full', '/api/strategies-full/progress', '/__ingest', '/healthz'],
        }, null, 2),
        { headers: { ...baseCors, 'content-type': 'application/json' } },
      );
    }
    return new Response('not found', { status: 404, headers: baseCors });
  },
};

async function serveRawCatalog(env: Env, download = false): Promise<Response> {
  const obj = await env.CATALOG.get(CATALOG_KEY);
  if (!obj) {
    return jsonResponse({ error: 'catalog not built yet' }, 503, 60);
  }
  const builtAt = Number(obj.customMetadata?.builtAt) || obj.uploaded.getTime();
  return new Response(obj.body, {
    headers: {
      ...baseCors,
      'content-type': 'application/json',
      'cache-control': 'public, max-age=3600, s-maxage=3600',
      etag: obj.httpEtag,
      'last-modified': obj.uploaded.toUTCString(),
      ...(download ? downloadHeaders(builtAt, true) : {}),
    },
  });
}

async function serveEnabledCatalog(env: Env, download = false): Promise<Response> {
  const obj = await env.CATALOG.get(ENABLED_KEY);
  if (obj) {
    return new Response(obj.body, {
      headers: {
        ...baseCors,
        'content-type': 'application/json',
        'cache-control': 'public, max-age=3600, s-maxage=3600',
        etag: obj.httpEtag,
        'last-modified': obj.uploaded.toUTCString(),
        'x-catalog-size': obj.customMetadata?.size ?? '',
        'x-catalog-built-at': obj.customMetadata?.builtAt ?? '',
        ...(download
          ? downloadHeaders(Number(obj.customMetadata?.builtAt) || obj.uploaded.getTime(), false)
          : {}),
      },
    });
  }
  // Fallback for the window between deploying this Worker and the next proxy
  // ingest: derive the enabled array from the raw envelope on the fly so the
  // path serves the right shape immediately. Short cache so the derived copy
  // stops being served soon after the first real ingest lands.
  const raw = await env.CATALOG.get(CATALOG_KEY);
  if (!raw) {
    return jsonResponse({ error: 'catalog not built yet' }, 503, 60);
  }
  const parsed = (await raw.json()) as CatalogEnvelope;
  const items = Array.isArray(parsed.items) ? onlyEnabled(parsed.items) : [];
  // Self-heal: persist what we derived so the next request (and /progress)
  // read the stored copy instead of re-parsing the raw envelope every time.
  const builtAt = typeof parsed.at === 'number' ? parsed.at : Date.now();
  await storeEnabled(env, items, builtAt);
  return new Response(JSON.stringify(items), {
    headers: {
      ...baseCors,
      'content-type': 'application/json',
      'cache-control': 'public, max-age=300, s-maxage=300',
      'last-modified': raw.uploaded.toUTCString(),
      'x-catalog-size': String(items.length),
      'x-catalog-built-at': String(parsed.at ?? ''),
      'x-catalog-derived': '1',
      ...(download ? downloadHeaders(builtAt, false) : {}),
    },
  });
}

async function serveProgress(env: Env): Promise<Response> {
  const obj = await env.CATALOG.get(PROGRESS_KEY);
  if (!obj) {
    return jsonResponse({ ready: false, building: false, loaded: 0, total: 0, built_at: null }, 200, 60);
  }
  return new Response(obj.body, {
    headers: {
      ...baseCors,
      'content-type': 'application/json',
      'cache-control': 'public, max-age=60, s-maxage=60',
    },
  });
}

async function ingest(req: Request, env: Env): Promise<Response> {
  if (!env.INGEST_SECRET) {
    return jsonResponse({ error: 'INGEST_SECRET not configured' }, 500);
  }
  const presented = req.headers.get('x-ingest-secret');
  if (presented !== env.INGEST_SECRET) {
    return jsonResponse({ error: 'forbidden' }, 403);
  }
  if (!req.body) {
    return jsonResponse({ error: 'empty body' }, 400);
  }

  // Body arrives gzipped (Content-Encoding: gzip). Decompress so we can both
  // (a) extract item count for progress.json, and (b) store raw JSON on R2 so
  // the GET path doesn't double-gzip via CF's automatic egress compression.
  let json: string;
  let parsed: CatalogEnvelope;
  try {
    const ds = new DecompressionStream('gzip');
    json = await new Response(req.body.pipeThrough(ds)).text();
    parsed = JSON.parse(json) as CatalogEnvelope;
  } catch (e) {
    return jsonResponse({ error: 'failed to parse gzipped JSON: ' + (e as Error).message }, 400);
  }
  if (!Array.isArray(parsed.items)) {
    return jsonResponse({ error: 'payload missing items[]' }, 400);
  }
  const count = parsed.items.length;
  const builtAt = typeof parsed.at === 'number' ? parsed.at : Date.now();

  await env.CATALOG.put(CATALOG_KEY, json, {
    httpMetadata: { contentType: 'application/json', cacheControl: 'public, max-age=3600' },
    // builtAt so ?download=1 can name the file after the build, not the upload.
    customMetadata: { size: String(count), builtAt: String(builtAt) },
  });
  // Browser-facing copy (bare array, disabled rows dropped) + progress.json.
  const enabled = onlyEnabled(parsed.items);
  await storeEnabled(env, enabled, builtAt);

  return jsonResponse({ ok: true, count, enabled: enabled.length, built_at: builtAt, bytes: json.length });
}

function jsonResponse(body: unknown, status = 200, maxAge = 0): Response {
  const headers: Record<string, string> = {
    ...baseCors,
    'content-type': 'application/json',
  };
  if (maxAge > 0) headers['cache-control'] = `public, max-age=${maxAge}`;
  return new Response(JSON.stringify(body), { status, headers });
}
