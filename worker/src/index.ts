// Cloudflare Worker that fronts the pelican catalog R2 bucket.
//
// Read endpoints (cached at the edge for 1h):
//   GET  /api/strategies-full           → strategies-full.json from R2
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
const PROGRESS_KEY = 'progress.json';

const baseCors: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type, x-ingest-secret, content-encoding',
};

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: baseCors });
    }

    if (req.method === 'GET' && url.pathname === '/api/strategies-full') {
      return serveCatalog(env);
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

async function serveCatalog(env: Env): Promise<Response> {
  const obj = await env.CATALOG.get(CATALOG_KEY);
  if (!obj) {
    return jsonResponse({ error: 'catalog not built yet' }, 503, 60);
  }
  return new Response(obj.body, {
    headers: {
      ...baseCors,
      'content-type': 'application/json',
      'cache-control': 'public, max-age=3600, s-maxage=3600',
      etag: obj.httpEtag,
      'last-modified': obj.uploaded.toUTCString(),
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
  let parsed: { at?: number; items?: unknown[] };
  try {
    const ds = new DecompressionStream('gzip');
    json = await new Response(req.body.pipeThrough(ds)).text();
    parsed = JSON.parse(json) as { at?: number; items?: unknown[] };
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
  });
  const progress = JSON.stringify({
    ready: true,
    building: false,
    loaded: count,
    total: count,
    built_at: builtAt,
  });
  await env.CATALOG.put(PROGRESS_KEY, progress, {
    httpMetadata: { contentType: 'application/json' },
  });

  return jsonResponse({ ok: true, count, built_at: builtAt, bytes: json.length });
}

function jsonResponse(body: unknown, status = 200, maxAge = 0): Response {
  const headers: Record<string, string> = {
    ...baseCors,
    'content-type': 'application/json',
  };
  if (maxAge > 0) headers['cache-control'] = `public, max-age=${maxAge}`;
  return new Response(JSON.stringify(body), { status, headers });
}
