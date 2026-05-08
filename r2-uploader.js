const zlib = require('zlib');

// POSTs the freshly-built full catalog to the Cloudflare Worker, which writes it
// to R2. We don't talk to R2 directly — the Worker has the R2 binding and
// validates the shared secret. Keeps the proxy free of AWS SigV4 / SDK noise.
//
// Required env:
//   CATALOG_INGEST_URL    e.g. https://pelican-catalog-worker.example.workers.dev/__ingest
//   CATALOG_INGEST_SECRET shared secret matching the Worker's INGEST_SECRET binding
//
// If either is unset, the upload is skipped silently — local dev / forks without
// Cloudflare set up still work, they just don't populate R2.
async function uploadCatalog(items) {
  const url = process.env.CATALOG_INGEST_URL;
  const secret = process.env.CATALOG_INGEST_SECRET;
  if (!url || !secret) {
    console.log('[r2] skipped — CATALOG_INGEST_URL/SECRET not set');
    return;
  }
  if (!Array.isArray(items) || items.length === 0) {
    console.warn('[r2] skipped — empty items array');
    return;
  }
  const body = JSON.stringify({ at: Date.now(), items });
  const gz = zlib.gzipSync(body);
  const t0 = Date.now();
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Encoding': 'gzip',
        'X-Ingest-Secret': secret,
      },
      body: gz,
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      throw new Error(`HTTP ${r.status} ${r.statusText} ${txt.slice(0, 200)}`);
    }
    console.log(`[r2] uploaded ${items.length} items (${gz.length}B gz) in ${Date.now() - t0}ms`);
  } catch (e) {
    console.error('[r2] upload failed:', e.message);
  }
}

module.exports = { uploadCatalog };
