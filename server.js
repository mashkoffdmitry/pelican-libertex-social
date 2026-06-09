const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const zlib = require('zlib');
const { uploadCatalog } = require('./r2-uploader');

const PKG_VERSION = '0.4.6';
const INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Libertex Social — Copy Trading</title>
  <link rel="stylesheet" href="https://unpkg.com/@mashkovd/pelican-vue@${PKG_VERSION}/dist/style.css">
  <style>
    * { box-sizing: border-box; } html, body { margin: 0; padding: 0; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script src="https://unpkg.com/vue@3.5/dist/vue.global.prod.js"></script>
  <script src="https://unpkg.com/@mashkovd/pelican-vue@${PKG_VERSION}/dist/pelican-libertex-social.umd.cjs"></script>
  <script>
    const { createApp, h } = Vue;
    const PelicanComponent = window.PelicanLibertexSocial.PelicanLibertexSocial;
    createApp({ render: () => h(PelicanComponent, { apiBase: '' }) }).mount('#app');
  </script>
</body>
</html>`;

// Gzip helper: respect client's Accept-Encoding, only compress text-y payloads
// (JSON / HTML / CSS / JS / SVG). PNG/JPG/WebP/etc are already compressed.
function sendCompressed(req, res, body, status, headers) {
  const ae = String(req.headers['accept-encoding'] || '');
  const ctype = String(headers['Content-Type'] || headers['content-type'] || '');
  const compressible = /^(application\/json|text\/|image\/svg\+xml|application\/javascript)/.test(ctype);
  if (compressible && /\bgzip\b/.test(ae) && body && body.length > 1024) {
    const gz = zlib.gzipSync(body);
    res.writeHead(status, { ...headers, 'Content-Encoding': 'gzip', 'Vary': 'Accept-Encoding', 'Content-Length': gz.length });
    res.end(gz);
    return;
  }
  res.writeHead(status, headers);
  res.end(body);
}

const PORT = parseInt(process.env.PORT || '8787', 10);
const ROOT = __dirname;
const ENV_PATH = process.env.ENV_PATH || path.join(ROOT, '.env');
const UPSTREAM_HOST = 'papi.copy-trade.io';

// ---- whitelist of allowed upstream API paths (read-only catalog only) ----
const ALLOWED = [
  /^\/api\/discover\/?$/,
  /^\/api\/discover\/[A-Za-z]+\/?$/,
  /^\/api\/strategies\/?$/,
  /^\/api\/strategies\/\d+\/?$/,
  /^\/api\/strategies\/\d+\/stats\/?$/,
  /^\/api\/strategies\/\d+\/signals\/open\/?$/,
  /^\/api\/strategies\/\d+\/signals\/closed\/?$/,
  /^\/api\/servers\/?$/,
  /^\/api\/brokers\/?$/,
];
function pathAllowed(p) { return ALLOWED.some(re => re.test(p)); }

// ---- catalog cache: aggregated full list of strategies via filter scan ----
const CATALOG_TTL_MS = 10 * 60 * 1000;
let catalogCache = { at: 0, items: null, building: null };

const SCAN_QUERIES = (() => {
  const out = [];
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  for (const c of chars) out.push(c);
  const v = 'aeiouy', con = 'bcdfghjklmnprstvwz';
  for (const a of v) for (const b of con) out.push(a + b);
  for (const a of con) for (const b of v) out.push(a + b);
  for (const p of ['gold','forex','trade','sca','pro','vip','sig','bot','old','ing','er','fx','top','ai','%E2']) out.push(p);
  return Array.from(new Set(out));
})();

const upstreamAgent = new https.Agent({ keepAlive: true, maxSockets: 32, maxFreeSockets: 16 });

function upstreamGet(p, token, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const opts = {
      method: 'GET', hostname: UPSTREAM_HOST, path: p,
      headers: {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/json',
        'User-Agent': 'pelican-proxy/0.3',
        'Connection': 'keep-alive',
      },
      agent: upstreamAgent,
      timeout: timeoutMs,
    };
    const r = https.request(opts, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(buf)); } catch (e) { reject(e); }
        } else if (res.statusCode === 404) {
          resolve(null);
        } else {
          const err = new Error(`upstream ${res.statusCode}`);
          err.status = res.statusCode;
          err.retryAfter = parseInt(res.headers['retry-after'] || '0', 10);
          reject(err);
        }
      });
    });
    r.on('timeout', () => { r.destroy(new Error('timeout')); });
    r.on('error', reject);
    r.end();
  });
}

// global pause until this timestamp (when we hit 429)
let pauseUntil = 0;
async function maybeWaitForPause() {
  const now = Date.now();
  if (pauseUntil > now) await new Promise(r => setTimeout(r, pauseUntil - now));
}

async function upstreamGetRetry(p, token, attempts = 4) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    await maybeWaitForPause();
    try { return await upstreamGet(p, token, 20000); }
    catch (e) {
      lastErr = e;
      if (e.status === 401) throw e;
      if (e.status === 429) {
        const wait = (e.retryAfter > 0 ? e.retryAfter * 1000 : 30000) + Math.random() * 1000;
        pauseUntil = Math.max(pauseUntil, Date.now() + wait);
        await new Promise(r => setTimeout(r, wait));
      } else {
        await new Promise(r => setTimeout(r, 300 + i * 500));
      }
    }
  }
  throw lastErr;
}

// Discover groups that act as alternate strategy-id sources beyond the substring scan.
// /api/discover/Strategies returns the full ranked list (~2500), CopiersBalance ~1100,
// GlobalSignals ~800. Together with the substring scan this surfaces ~3000+ active strategies.
const DISCOVER_CODES_CATALOG = [
  'Strategies', 'GlobalSignals', 'CopiersBalance',
  'CopiersProfitMonth', 'CopiersProfitYear',
  'NewSignalProviders', 'TopFreeSignals', 'TopPaidSignals',
  'PerformanceFeeMonth', 'PerformanceFeeYear',
  'AvgInstructionsPerMonth', 'WinRate',
  'ReturnLastWeek', 'ReturnLastMonth', 'ReturnLastQuarter',
  'HighRisk', 'MediumRisk', 'LowRisk',
  'MaxDrawdown', 'Spotlight',
];

async function buildCatalog(token) {
  const map = new Map();
  const concurrency = 5;

  // 1. Substring scan
  let i = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (i < SCAN_QUERIES.length) {
      const q = SCAN_QUERIES[i++];
      try {
        const arr = await upstreamGet('/api/strategies?filter=' + encodeURIComponent(q), token);
        if (Array.isArray(arr)) for (const it of arr) if (it && it.Id) map.set(it.Id, it);
      } catch (e) {}
    }
  }));
  console.log(`[catalog] after substring scan: ${map.size}`);

  // 2. Discover groups (sequential, low pressure)
  for (const code of DISCOVER_CODES_CATALOG) {
    try {
      const arr = await upstreamGet('/api/discover/' + code, token);
      if (Array.isArray(arr)) {
        for (const it of arr) {
          const s = it.Strategy;
          if (!s || !s.Id) continue;
          if (!map.has(s.Id)) {
            map.set(s.Id, {
              Id: s.Id, Name: s.Name,
              ImageUploaded: s.ImageUploaded, Profile: s.Profile,
            });
          }
        }
      }
    } catch (e) {}
  }
  console.log(`[catalog] after discover groups: ${map.size}`);

  return [...map.values()];
}

async function getCatalog(token) {
  const now = Date.now();
  if (catalogCache.items && (now - catalogCache.at) < CATALOG_TTL_MS) return catalogCache.items;
  if (catalogCache.building) return catalogCache.building;
  catalogCache.building = (async () => {
    const items = await buildCatalog(token);
    catalogCache = { at: Date.now(), items, building: null };
    console.log(`[catalog] built ${items.length} strategies`);
    return items;
  })();
  return catalogCache.building;
}

// ---- full catalog with stats+meta ----
// Rebuild interval controlled by CATALOG_REBUILD_INTERVAL_H (default 6).
// TTL = interval + 2h buffer so a slow build never races with the next scheduled one.
const REBUILD_INTERVAL_H = parseInt(process.env.CATALOG_REBUILD_INTERVAL_H) || 6;
const FULL_TTL_MS = (REBUILD_INTERVAL_H + 2) * 60 * 60 * 1000;
const CATALOG_FILE = path.join(ROOT, '.catalog.json');
let fullCache = { at: 0, items: null, partial: null, building: null, progress: { loaded: 0, total: 0 }, built_in_s: null };

function saveCatalogToDisk(items) {
  try {
    fs.writeFileSync(CATALOG_FILE, JSON.stringify({ at: Date.now(), items }));
    console.log(`[catalog] persisted ${items.length} items to ${CATALOG_FILE}`);
  } catch (e) { console.error('[catalog] persist failed:', e.message); }
}

function loadCatalogFromDisk() {
  try {
    if (!fs.existsSync(CATALOG_FILE)) return null;
    const j = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
    if (!Array.isArray(j.items) || !j.at) return null;
    return j;
  } catch { return null; }
}

// On cold start, seed fullCache from R2 if CATALOG_INGEST_URL is configured.
// Returns true if the catalog was successfully seeded.
async function seedFromR2() {
  const ingestUrl = process.env.CATALOG_INGEST_URL;
  if (!ingestUrl) return false;
  try {
    const base = new URL(ingestUrl).origin;
    const r = await fetch(`${base}/api/strategies-full`, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) { console.log(`[r2] seed skipped: HTTP ${r.status}`); return false; }
    const j = await r.json();
    if (!Array.isArray(j.items) || j.items.length === 0) { console.log('[r2] seed skipped: empty catalog in R2'); return false; }
    const ageH = ((Date.now() - (j.at || 0)) / 3600000).toFixed(1);
    fullCache = { at: j.at || Date.now(), items: j.items, partial: null, building: null, progress: { loaded: j.items.length, total: j.items.length } };
    console.log(`[r2] seeded ${j.items.length} items from R2 (age ${ageH}h)`);
    // If the seeded catalog predates the History-baking change, force an immediate
    // rebuild so the next R2 push includes per-strategy History. Without this the
    // first deploy after the schema change has to wait the full rebuild interval
    // (default 6h) before users see baked-in sparklines.
    const sample = j.items.find(it => it && typeof it === 'object');
    const hasHistory = sample && Array.isArray(sample.History);
    if (!hasHistory) {
      console.log('[r2] seeded catalog lacks History → scheduling immediate rebuild to populate it');
      // Defer to next tick so seed completes; scheduler will pick up at=0 on its next 60s tick.
      setImmediate(() => { fullCache.at = 0; });
    }
    return true;
  } catch (e) {
    console.log('[r2] seed failed:', e.message);
    return false;
  }
}

// Trim history to ~60 points (matches the Vue widget's Sparkline density)
// + drop sub-second timestamp precision and round AccountReturn to 4 decimals.
// Same payload as widget produces locally, just baked into the catalog so the
// sparkline shows up on first paint instead of after a per-row enrichment.
function compactHistory(hist) {
  if (!Array.isArray(hist) || hist.length === 0) return [];
  const stride = hist.length > 60 ? Math.ceil(hist.length / 60) : 1;
  const out = [];
  for (let i = 0; i < hist.length; i++) {
    if (i % stride !== 0 && i !== hist.length - 1) continue;
    const p = hist[i];
    const ts = typeof p.Timestamp === 'string' ? p.Timestamp.slice(0, 10) : p.Timestamp;
    const r = typeof p.AccountReturn === 'number' ? Math.round(p.AccountReturn * 1e4) / 1e4 : p.AccountReturn;
    out.push({ Timestamp: ts, AccountReturn: r });
  }
  return out;
}

function compactStrategy(meta, stats, base) {
  const inc = stats?.Profitability?.Inception || {};
  const tr  = stats?.Trades?.Inception || {};
  // Fallback chain: today's fresh fetch → previous catalog value → null. So a transient
  // upstream blip during the daily rebuild keeps yesterday's data instead of nuking the row.
  const history = stats ? compactHistory(inc.History) : (Array.isArray(base.History) ? base.History : []);
  return {
    Id: base.Id,
    Name: meta?.Name ?? base.Name ?? null,
    ImageUploaded: meta?.ImageUploaded ?? base.ImageUploaded ?? null,
    Profile: meta?.Profile || base.Profile || null,
    NumCopiers: meta?.NumCopiers ?? base.NumCopiers ?? null,
    Fee: meta?.Fee ?? base.Fee ?? null,
    RiskProfile: meta?.RiskProfile ?? base.RiskProfile ?? null,
    IsSimulated: meta?.IsSimulated ?? base.IsSimulated ?? false,
    IsEnabled: meta?.IsEnabled ?? base.IsEnabled ?? null,
    Inception: stats?.Inception ?? base.Inception ?? null,
    Currency: stats?.CurrencyCode ?? base.Currency ?? null,
    Return: inc.UnrealisedReturn != null ? inc.UnrealisedReturn * 100 : (inc.RealisedReturn != null ? inc.RealisedReturn * 100 : (base.Return ?? null)),
    MaxDD: inc.MaxDrawdown != null ? inc.MaxDrawdown * 100 : (base.MaxDD ?? null),
    RealisedPnl: inc.RealisedPnl ?? base.RealisedPnl ?? null,
    UnrealisedPnl: inc.UnrealisedPnl ?? base.UnrealisedPnl ?? null,
    History: history,
    TradesTotal: tr.Total ?? base.TradesTotal ?? 0,
    Wins: tr.Wins ?? base.Wins ?? 0,
    Losses: tr.Losses ?? base.Losses ?? 0,
    Markets: Array.isArray(tr.Markets) ? tr.Markets.slice(0, 12).map(m => ({ n: m.MarketName, c: m.Count }))
             : (Array.isArray(base.Markets) ? base.Markets : []),
    AccountBalance: stats?.Status?.Balance ?? base.AccountBalance ?? null,
    CopiersAUM: stats?.CopiersBalance?.Balance ?? base.CopiersAUM ?? null,
    MonthlyProfit: stats?.CopiersProfit?.Month ?? base.MonthlyProfit ?? null,
    YearlyProfit: stats?.CopiersProfit?.Year ?? base.YearlyProfit ?? null,
    _stats: !!stats || !!base._stats,
    _meta:  !!meta  || !!base._meta,
  };
}

async function buildFull(token) {
  let base = await getCatalog(token);
  fullCache.progress = { loaded: 0, total: base.length };

  // Get meta-equivalent (NumCopiers, Fee, RiskProfile) from /api/discover groups for known top strategies
  const discoverMeta = await collectDiscoverMeta(token);

  // Seed base with the previous catalog so when today's fetch fails (transient 429/timeout/etc.)
  // compactStrategy can fall back to yesterday's values rather than wiping the row to nulls.
  const prev = loadCatalogFromDisk();
  const prevById = new Map();
  if (prev?.items) for (const it of prev.items) prevById.set(it.Id, it);

  // Two-tier priority for build order:
  //   1) by Return (lower _returnRank from /api/discover/{Global,Return*} = higher priority)
  //   2) by Copiers (NumCopiers desc) for ties / strategies without a return rank
  base = base.slice().sort((a, b) => {
    const ma = discoverMeta.get(a.Id), mb = discoverMeta.get(b.Id);
    const ra = ma?._returnRank ?? Infinity, rb = mb?._returnRank ?? Infinity;
    if (ra !== rb) return ra - rb;
    const ca = ma?.NumCopiers ?? -1, cb = mb?.NumCopiers ?? -1;
    return cb - ca;
  });

  // Replace each base entry with its previous-catalog version so the entire fallback chain
  // works (Return, Markets, etc.). If we have no prior data, keep the discover stub.
  const baseWithPrev = base.map(b => ({ ...(prevById.get(b.Id) || {}), ...b }));

  const out = new Array(baseWithPrev.length);
  const concurrency = parseInt(process.env.CATALOG_BUILD_CONCURRENCY) || 12;
  let cursor = 0;
  let statsErr = 0, statsNull = 0, fetched = 0;

  // pre-fill output with partial entries (uses prev fallback already) so the partial cache is immediately usable
  for (let i = 0; i < baseWithPrev.length; i++) {
    out[i] = compactStrategy(discoverMeta.get(baseWithPrev[i].Id) || null, null, baseWithPrev[i]);
  }
  fullCache.partial = out;

  let metaErr = 0, statsSkipped = 0;
  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= baseWithPrev.length) return;
      const b = baseWithPrev[idx];
      // Skip the /stats fetch for strategies known-disabled in the previous catalog —
      // they account for ~80% of the catalog and are filtered out at serve time
      // (`onlyEnabled`). We still fetch /meta so we can detect a flip back to enabled,
      // and a second pass below catches those cases. Roughly halves rebuild time.
      const knownDisabled = prevById.get(b.Id)?.IsEnabled === false;
      const [metaR, statsR] = await Promise.allSettled([
        upstreamGetRetry('/api/strategies/' + b.Id, token),
        knownDisabled ? Promise.resolve(null) : upstreamGetRetry('/api/strategies/' + b.Id + '/stats', token),
      ]);
      let meta  = metaR.status  === 'fulfilled' ? metaR.value  : (metaErr++, null);
      let stats = statsR.status === 'fulfilled' ? statsR.value : (statsErr++, null);
      if (knownDisabled) statsSkipped++;
      else if (stats === null) statsNull++;
      // fall back to discover meta when /api/strategies/{id} returned 404 (private signal)
      if (!meta) meta = discoverMeta.get(b.Id) || null;
      out[idx] = compactStrategy(meta, stats, b);
      fullCache.progress.loaded++;
      fetched++;
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  console.log(`[full] fetched=${fetched} stats-skipped=${statsSkipped} stats-null=${statsNull} stats-err=${statsErr} meta-err=${metaErr}`);

  // Second pass: items that we skipped stats for, but whose fresh meta says
  // they're now IsEnabled=true (someone flipped them back on). Fetch their
  // stats so the catalog has fresh numbers + History instead of stale prev values.
  const newlyEnabled = [];
  for (let i = 0; i < out.length; i++) {
    const wasDisabled = prevById.get(baseWithPrev[i].Id)?.IsEnabled === false;
    if (wasDisabled && out[i].IsEnabled === true && !out[i]._stats) newlyEnabled.push(i);
  }
  if (newlyEnabled.length) {
    console.log(`[full] second pass: ${newlyEnabled.length} newly-enabled strategies`);
    let cur1 = 0, recovered = 0;
    async function newlyEnabledWorker() {
      while (true) {
        const j = cur1++;
        if (j >= newlyEnabled.length) return;
        const idx = newlyEnabled[j];
        const b = baseWithPrev[idx];
        const statsR = await upstreamGetRetry('/api/strategies/' + b.Id + '/stats', token).catch(() => null);
        if (statsR) {
          out[idx] = compactStrategy(out[idx], statsR, b);
          recovered++;
        }
      }
    }
    await Promise.all(Array.from({ length: concurrency }, newlyEnabledWorker));
    console.log(`[full] second pass: ${recovered}/${newlyEnabled.length} now have stats`);
  }

  // Final retry pass: anything that ended without meta AND without prior data → try once more
  // with longer cool-down. This catches the "first build for new strategy + transient blip" case.
  const stillEmpty = [];
  for (let i = 0; i < out.length; i++) {
    if (!out[i]._meta && !out[i]._stats) stillEmpty.push(i);
  }
  if (stillEmpty.length) {
    console.log(`[full] final retry pass on ${stillEmpty.length} unenriched`);
    let cur2 = 0, fixed = 0;
    async function retryWorker() {
      while (true) {
        const j = cur2++;
        if (j >= stillEmpty.length) return;
        const idx = stillEmpty[j];
        const b = baseWithPrev[idx];
        // small spacing per request to dodge bursty rate limits
        await new Promise(r => setTimeout(r, 50 + Math.random() * 150));
        const [metaR, statsR] = await Promise.allSettled([
          upstreamGetRetry('/api/strategies/' + b.Id, token, 6),
          upstreamGetRetry('/api/strategies/' + b.Id + '/stats', token, 6),
        ]);
        const meta  = metaR.status  === 'fulfilled' ? metaR.value  : null;
        const stats = statsR.status === 'fulfilled' ? statsR.value : null;
        if (meta || stats) {
          out[idx] = compactStrategy(meta || discoverMeta.get(b.Id) || null, stats, b);
          fixed++;
        }
      }
    }
    // half the concurrency for the retry pass to be gentle
    await Promise.all(Array.from({ length: Math.max(1, Math.floor(concurrency / 2)) }, retryWorker));
    console.log(`[full] final retry recovered ${fixed} of ${stillEmpty.length}`);
  }
  return out;
}

async function collectDiscoverMeta(token) {
  const map = new Map();
  // ranking signal: lower number = higher priority (used to schedule stat fetches first)
  const setRank = (id, rank) => {
    const cur = map.get(id) || {};
    if (cur._returnRank == null || rank < cur._returnRank) cur._returnRank = rank;
    map.set(id, cur);
  };
  try {
    const groups = await upstreamGet('/api/discover', token);
    if (Array.isArray(groups)) {
      const riskByGroup = { LowRisk: 'Low', MediumRisk: 'Medium', HighRisk: 'High' };
      for (const g of groups) {
        const groupRisk = riskByGroup[g.ItemType];
        for (const it of (g.Items || [])) {
          const s = it.Strategy;
          if (!s?.Id) continue;
          const cur = map.get(s.Id) || {};
          if (s.Name && !cur.Name) cur.Name = s.Name;
          if (s.NumCopiers != null) cur.NumCopiers = s.NumCopiers;
          if (s.Fee != null) cur.Fee = s.Fee;
          if (s.ImageUploaded) cur.ImageUploaded = s.ImageUploaded;
          if (s.Profile) cur.Profile = s.Profile;
          if (groupRisk && !cur.RiskProfile) cur.RiskProfile = groupRisk;
          map.set(s.Id, cur);
        }
      }
    }
  } catch {}
  // Pull ranked-by-return strategies separately for priority queue
  for (const code of ['GlobalSignals', 'ReturnLastQuarter', 'ReturnLastMonth', 'TopFreeSignals']) {
    try {
      const arr = await upstreamGet('/api/discover/' + code, token);
      if (Array.isArray(arr)) {
        for (const it of arr) {
          const s = it.Strategy;
          if (!s?.Id) continue;
          const cur = map.get(s.Id) || {};
          if (s.Name && !cur.Name) cur.Name = s.Name;
          if (s.NumCopiers != null) cur.NumCopiers = s.NumCopiers;
          if (s.Fee != null) cur.Fee = s.Fee;
          if (s.ImageUploaded) cur.ImageUploaded = s.ImageUploaded;
          if (s.Profile) cur.Profile = s.Profile;
          map.set(s.Id, cur);
          setRank(s.Id, it.Rank ?? 99999);
        }
      }
    } catch {}
  }
  return map;
}

function getFull(token) {
  const now = Date.now();
  // Fresh items: return immediately.
  if (fullCache.items && (now - fullCache.at) < FULL_TTL_MS) return Promise.resolve(fullCache.items);
  // Stale items + already rebuilding: serve stale (don't make user wait).
  if (fullCache.items && fullCache.building) return Promise.resolve(fullCache.items);
  // Stale items + idle: kick off background rebuild, return stale immediately.
  if (fullCache.items && !fullCache.building) {
    fullCache.building = (async () => {
      const t0 = Date.now();
      const items = await buildFull(token);
      const built_in_s = +((Date.now()-t0)/1000).toFixed(1);
      fullCache = { at: Date.now(), items, partial: fullCache.items, building: null, progress: { loaded: items.length, total: items.length }, built_in_s };
      console.log(`[full] background-rebuilt ${items.length} enriched strategies in ${built_in_s}s`);
      saveCatalogToDisk(items);
      uploadCatalog(items);
      return items;
    })();
    return Promise.resolve(fullCache.items);
  }
  // No items at all: must wait.
  if (fullCache.building) return fullCache.building;
  fullCache.building = (async () => {
    const t0 = Date.now();
    const items = await buildFull(token);
    const built_in_s = +((Date.now()-t0)/1000).toFixed(1);
    fullCache = { at: Date.now(), items, partial: items, building: null, progress: { loaded: items.length, total: items.length }, built_in_s };
    console.log(`[full] built ${items.length} enriched strategies in ${built_in_s}s`);
    saveCatalogToDisk(items);
    uploadCatalog(items);
    return items;
  })();
  return fullCache.building;
}

// ---- interval scheduler: rebuild every CATALOG_REBUILD_INTERVAL_H hours ----
function startScheduler() {
  console.log(`[scheduler] rebuild every ${REBUILD_INTERVAL_H}h (FULL_TTL ${REBUILD_INTERVAL_H + 2}h)`);
  setInterval(() => {
    const ageMs = fullCache.at ? Date.now() - fullCache.at : Infinity;
    const ageH = (ageMs / 3600_000).toFixed(1);
    if (!fullCache.building && ageMs > REBUILD_INTERVAL_H * 3600_000) {
      console.log(`[scheduler] ${REBUILD_INTERVAL_H}h interval — cache is ${ageH}h old, triggering rebuild`);
      catalogCache = { at: 0, items: null, building: null };
      fullCache.at = 0;
      fullCache.partial = fullCache.items || fullCache.partial;
      fullCache.building = null;
      const env = readEnv();
      if (env.ACCESS_TOKEN) {
        getFull(env.ACCESS_TOKEN).catch(e => console.error('[scheduler] rebuild failed:', e.message));
      }
    }
  }, 60_000);
}

// ---- env file ----
function readEnv() {
  const env = {};
  if (!fs.existsSync(ENV_PATH)) return env;
  for (const line of fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}
function writeEnv(env) {
  const txt = Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
  fs.writeFileSync(ENV_PATH, txt);
}

// ---- token-source IP detector (for /__ingest) ----
function isLocal(req) {
  const ra = req.socket.remoteAddress || '';
  // Accept loopback only. Behind tunnel, remote will be tunnel's local socket too,
  // so we additionally require X-Forwarded-For absence.
  const xff = req.headers['x-forwarded-for'];
  const looksLoopback = ra === '127.0.0.1' || ra === '::1' || ra === '::ffff:127.0.0.1';
  return looksLoopback && !xff;
}

// ---- naive rate limiter (per-IP, sliding 1-min window) ----
const RATE_LIMIT = parseInt(process.env.RATE_LIMIT || '120', 10); // req/min
const buckets = new Map(); // ip -> [timestamps]
function clientIp(req) {
  const xff = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xff || req.socket.remoteAddress || 'unknown';
}
function tooMany(req) {
  if (RATE_LIMIT <= 0) return false;
  const ip = clientIp(req);
  const now = Date.now();
  const cutoff = now - 60_000;
  let arr = buckets.get(ip) || [];
  arr = arr.filter(t => t > cutoff);
  if (arr.length >= RATE_LIMIT) { buckets.set(ip, arr); return true; }
  arr.push(now);
  buckets.set(ip, arr);
  return false;
}
setInterval(() => {
  const cutoff = Date.now() - 60_000;
  for (const [ip, arr] of buckets) {
    const f = arr.filter(t => t > cutoff);
    if (f.length === 0) buckets.delete(ip); else buckets.set(ip, f);
  }
}, 60_000).unref();

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

const server = http.createServer((req, res) => {
  const u = url.parse(req.url, true);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    return res.end();
  }

  // ---- /__ingest: localhost OR matching X-Ingest-Secret ----
  // Localhost path is the in-pod fast path (refresher.js writes the token
  // directly via fetch). The X-Ingest-Secret path is the operator-side
  // emergency override — set INGEST_SECRET in the pod's secret_env_vars
  // and POST from a Mac to inject a hand-grabbed token if the autonomous
  // OIDC client gets stuck (captcha, IdP outage, etc.).
  if (u.pathname === '/__ingest' && req.method === 'POST') {
    const ingestSecret = process.env.INGEST_SECRET || '';
    const provided = String(req.headers['x-ingest-secret'] || '');
    const secretOk = ingestSecret.length > 0 && provided.length > 0 && provided === ingestSecret;
    if (!isLocal(req) && !secretOk) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'forbidden' }));
    }
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const j = JSON.parse(body);
        if (!j.access_token) throw new Error('access_token required');
        const env = readEnv();
        env.ACCESS_TOKEN = j.access_token;
        env.EXPIRES_AT = String(j.expires_at || '');
        env.SAVED_AT = String(Math.floor(Date.now() / 1000));
        writeEnv(env);
        const len = j.access_token.length;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, len, expires_at: env.EXPIRES_AT }));
        console.log(`[ingest] token saved (len=${len}, expires_at=${env.EXPIRES_AT})`);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ---- /capture: only from localhost ----
  if (u.pathname === '/capture') {
    if (!isLocal(req)) { res.writeHead(404); return res.end(); }
    const html = `<!doctype html><meta charset="utf-8"><title>capture</title>
<style>body{font:14px system-ui;padding:24px;max-width:600px}code{background:#f3f3f3;padding:2px 6px;border-radius:3px}</style>
<h2>Pelican — token capture</h2>
<div id="msg">Reading hash…</div>
<script>
(async()=>{
  const m=document.getElementById('msg');
  const p=new URLSearchParams(location.hash.slice(1));
  const access_token=p.get('access_token');
  const expires_at=parseInt(p.get('expires_at')||'0',10);
  if(!access_token){m.textContent='No access_token in hash.';return;}
  history.replaceState(null,'','/capture');
  try{
    const r=await fetch('/__ingest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({access_token,expires_at})});
    const j=await r.json();
    if(j.ok){m.innerHTML='OK — token ingested ('+j.len+' chars). <a href="/">Open app</a>.';}
    else{m.textContent='Error: '+JSON.stringify(j);}
  }catch(e){m.textContent='Network error: '+e.message;}
})();
</script>`;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(html);
  }

  // ---- /healthz: always 200 if the process is up. For k8s liveness probe. ----
  if (u.pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true }));
  }

  // ---- /readyz: 200 only if we have a non-expired token. For k8s readiness probe. ----
  // Without this k8s sends traffic before the refresher's first login completes,
  // so clients see 503/no_token until the token lands.
  if (u.pathname === '/readyz') {
    const env = readEnv();
    const now = Math.floor(Date.now() / 1000);
    const exp = parseInt(env.EXPIRES_AT || '0', 10);
    const ready = !!env.ACCESS_TOKEN && exp > now;
    res.writeHead(ready ? 200 : 503, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ready, expires_at: exp || null, seconds_left: exp ? exp - now : null }));
  }

  // ---- /__status (public, only TTL info, no token leakage) ----
  if (u.pathname === '/__status') {
    const env = readEnv();
    const now = Math.floor(Date.now() / 1000);
    const exp = parseInt(env.EXPIRES_AT || '0', 10);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      hasToken: !!env.ACCESS_TOKEN,
      expires_at: exp || null,
      seconds_left: exp ? exp - now : null,
      expired: exp ? now >= exp : null,
    }));
  }

  // ---- /api/strategies-full/progress (poll while building) ----
  if (u.pathname === '/api/strategies-full/progress') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify({
      ready: !!fullCache.items && (Date.now() - fullCache.at) < FULL_TTL_MS,
      building: !!fullCache.building,
      loaded: fullCache.progress.loaded,
      total: fullCache.progress.total,
      built_at: fullCache.at || null,
      built_in_s: fullCache.built_in_s || null,
      schedule: `every ${REBUILD_INTERVAL_H}h`,
    }));
  }

  // ---- /api/strategies-full (full catalog; ?partial=1 returns whatever's loaded so far) ----
  // disabled strategies (IsEnabled=false) don't load on libertex.copy-trade.io and are filtered out.
  if (u.pathname === '/api/strategies-full') {
    if (req.method !== 'GET') { res.writeHead(405); return res.end(); }
    if (tooMany(req)) { res.writeHead(429, { 'Retry-After':'60' }); return res.end('rate_limited'); }
    const env = readEnv();
    if (!env.ACCESS_TOKEN) { res.writeHead(503); return res.end('no_token'); }
    const allowPartial = u.query.partial === '1';
    const onlyEnabled = arr => arr.filter(s => s.IsEnabled !== false);
    // Partial mode: prefer items if we have them (fresh or stale), fall back to partial
    // (in-flight build's pre-fill). Either way the user sees something instead of waiting.
    if (allowPartial) {
      const src = fullCache.items || fullCache.partial;
      if (src) {
        const out = onlyEnabled(src);
        sendCompressed(req, res, Buffer.from(JSON.stringify(out)), 200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300',  // browsers can re-use for 5 min — saves ngrok bytes
          'X-Catalog-Building': fullCache.building ? '1' : '0',
          'X-Catalog-Size': String(out.length),
          'X-Catalog-Loaded': String(fullCache.progress.loaded),
        });
        // touch getFull so a stale-while-revalidate kick happens if needed
        getFull(env.ACCESS_TOKEN).catch(()=>{});
        return;
      }
    }
    getFull(env.ACCESS_TOKEN).then(items => {
      const out = onlyEnabled(items);
      sendCompressed(req, res, Buffer.from(JSON.stringify(out)), 200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
        'X-Catalog-Built-At': String(fullCache.at),
        'X-Catalog-Size': String(out.length),
        'X-Catalog-Total-Raw': String(items.length),
      });
    }).catch(e => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'full_failed', message: e.message }));
    });
    return;
  }

  // ---- /api/strategies-all (id+name catalog only, cached) ----
  if (u.pathname === '/api/strategies-all') {
    if (req.method !== 'GET') { res.writeHead(405); return res.end(); }
    if (tooMany(req)) { res.writeHead(429, { 'Retry-After':'60' }); return res.end('rate_limited'); }
    const env = readEnv();
    if (!env.ACCESS_TOKEN) { res.writeHead(503); return res.end('no_token'); }
    getCatalog(env.ACCESS_TOKEN).then(items => {
      sendCompressed(req, res, Buffer.from(JSON.stringify(items)), 200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
        'X-Catalog-Built-At': String(catalogCache.at),
        'X-Catalog-Size': String(items.length),
      });
    }).catch(e => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'catalog_failed', message: e.message }));
    });
    return;
  }

  // ---- /api/* ----
  if (u.pathname.startsWith('/api/')) {
    if (req.method !== 'GET') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'method_not_allowed' }));
    }
    if (!pathAllowed(u.pathname)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'path_forbidden', path: u.pathname }));
    }
    if (tooMany(req)) {
      res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '60' });
      return res.end(JSON.stringify({ error: 'rate_limited', limit: RATE_LIMIT + '/min' }));
    }
    const env = readEnv();
    if (!env.ACCESS_TOKEN) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'no_token', hint: 'host needs to provide token' }));
    }
    const opts = {
      method: 'GET', hostname: UPSTREAM_HOST, path: req.url,
      headers: {
        'Authorization': 'Bearer ' + env.ACCESS_TOKEN,
        'Accept': 'application/json',
        'User-Agent': 'pelican-proxy/0.2',
      },
    };
    const upstreamReq = https.request(opts, upstreamRes => {
      const headers = { ...upstreamRes.headers };
      delete headers['transfer-encoding'];
      headers['Access-Control-Allow-Origin'] = '*';
      res.writeHead(upstreamRes.statusCode, headers);
      upstreamRes.pipe(res);
    });
    upstreamReq.on('error', e => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'upstream_error', message: e.message }));
    });
    upstreamReq.end();
    return;
  }

  // ---- static assets (blobs + brand logo) ----
  if (u.pathname === '/bg-blob.png' || u.pathname === '/bg-blob2.png' || u.pathname === '/logo.png') {
    const file = path.join(__dirname, u.pathname.slice(1));
    if (fs.existsSync(file)) {
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' });
      return fs.createReadStream(file).pipe(res);
    }
    res.writeHead(404); return res.end('not found');
  }

  // ---- root landing ----
  if (u.pathname === '/') {
    const wantsHtml = (req.headers['accept'] || '').includes('text/html');
    if (wantsHtml) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(INDEX_HTML);
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({
      name: 'pelican-proxy',
      description: 'Libertex Social copy-trading catalog proxy.',
      npm: 'https://www.npmjs.com/package/@mashkovd/pelican-vue',
      repo: 'https://github.com/mashkoffdmitry/pelican-libertex-social',
      endpoints: [
        '/healthz', '/readyz', '/__status',
        '/api/strategies', '/api/strategies-full', '/api/strategies-full/progress',
        '/api/strategies/{id}', '/api/strategies/{id}/stats',
        '/api/strategies/{id}/signals/{open|closed}',
      ],
    }, null, 2));
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('not found: ' + u.pathname);
});

server.listen(PORT, () => {
  console.log(`pelican proxy: http://localhost:${PORT}`);
  console.log(`rate limit: ${RATE_LIMIT}/min/IP, allowed paths: ${ALLOWED.length}`);

  // Try loading persisted catalog
  const disk = loadCatalogFromDisk();
  if (disk) {
    fullCache = { at: disk.at, items: disk.items, partial: null, building: null, progress: { loaded: disk.items.length, total: disk.items.length } };
    const ageH = ((Date.now() - disk.at) / 3600000).toFixed(1);
    console.log(`[catalog] restored ${disk.items.length} items from disk (age ${ageH}h)`);
  }

  startScheduler();

  (async () => {
    // On cold start: prefer R2 over a full rebuild.
    // Priority: disk cache → R2 seed → full rebuild.
    let hasCache = !!disk;
    if (!hasCache) hasCache = await seedFromR2();

    const env = readEnv();
    if (env.ACCESS_TOKEN) {
      const left = parseInt(env.EXPIRES_AT || '0', 10) - Math.floor(Date.now() / 1000);
      console.log(`token loaded (${left}s left)`);
      if (!hasCache) {
        // No disk cache and R2 is empty — kick off initial build
        setTimeout(() => {
          console.log('[startup] no cache — building catalog now…');
          getFull(env.ACCESS_TOKEN).then(items => {
            console.log(`[startup] full catalog ready: ${items.length} items`);
          }).catch(e => console.error('[startup] full build failed:', e.message));
        }, 1000);
      }
    } else {
      console.log('[startup] no token yet — will retry initial build once refresher saves one');
      const t0 = Date.now();
      const poll = setInterval(() => {
        const e = readEnv();
        if (e.ACCESS_TOKEN) {
          clearInterval(poll);
          if (hasCache) {
            console.log('[startup] token available — catalog already seeded from R2, skipping rebuild');
          } else {
            console.log('[startup] token now available — building catalog…');
            getFull(e.ACCESS_TOKEN).then(items => {
              console.log(`[startup] full catalog ready: ${items.length} items`);
            }).catch(err => console.error('[startup] full build failed:', err.message));
          }
        } else if (Date.now() - t0 > 5 * 60_000) {
          clearInterval(poll);
          console.error('[startup] no token after 5min — giving up');
        }
      }, 10_000);
    }
  })().catch(e => console.error('[startup] init error:', e.message));
});
