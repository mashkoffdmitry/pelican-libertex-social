// One-off: walk the catalog, re-fetch meta/stats for any strategy still _meta:false or _stats:false,
// merge results back into .catalog.json. Run from C:\Pelican (where .env / .catalog.json live).
'use strict';
const fs = require('fs');
const path = require('path');

(function loadEnv() {
  const p = path.join(__dirname, '.env');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
})();

const TOKEN = process.env.ACCESS_TOKEN;
const CATALOG = path.join(__dirname, '.catalog.json');
const UPSTREAM = 'https://papi.copy-trade.io';

if (!TOKEN) { console.error('no ACCESS_TOKEN'); process.exit(1); }

let pauseUntil = 0;
async function fetchWithRetry(p, attempts = 6) {
  let lastCode = 0;
  for (let i = 0; i < attempts; i++) {
    if (pauseUntil > Date.now()) await new Promise(r => setTimeout(r, pauseUntil - Date.now()));
    try {
      const r = await fetch(UPSTREAM + p, { headers: { Authorization: 'Bearer ' + TOKEN } });
      if (r.ok) return await r.json();
      lastCode = r.status;
      if (r.status === 404) return null;
      if (r.status === 429 || r.status >= 500) {
        const ra = parseInt(r.headers.get('retry-after') || '0', 10);
        const wait = (ra > 0 ? ra * 1000 : 5000 * Math.pow(2, i)) + Math.random() * 1000;
        pauseUntil = Math.max(pauseUntil, Date.now() + wait);
        continue;
      }
      // other 4xx: don't retry
      return null;
    } catch (e) {
      lastCode = -1;
      await new Promise(r => setTimeout(r, 2000 * (i + 1)));
    }
  }
  // ran out of attempts
  return { __error: lastCode };
}
async function safeGet(p) {
  const v = await fetchWithRetry(p);
  if (v && v.__error != null) return null;
  return v;
}

function compact(meta, stats, base) {
  const inc = stats?.Profitability?.Inception || {};
  const tr  = stats?.Trades?.Inception || {};
  const hist = inc.History || [];
  const stride = hist.length > 60 ? Math.ceil(hist.length / 60) : 1;
  const trimmed = hist.filter((_, i) => i % stride === 0 || i === hist.length - 1);
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
    History: trimmed.length ? trimmed : (base.History || []),
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

(async () => {
  const t0 = Date.now();
  const disk = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
  const items = disk.items;
  const need = items.filter(s => !s._meta || !s._stats);
  console.log(`[patch-missing] catalog total: ${items.length}, missing meta/stats: ${need.length}`);

  const concurrency = 4;
  let cursor = 0, done = 0, fixed = 0, stillFailing = 0;
  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= need.length) return;
      const b = need[idx];
      const [meta, stats] = await Promise.all([
        safeGet('/api/strategies/' + b.Id),
        safeGet('/api/strategies/' + b.Id + '/stats'),
      ]);
      done++;
      if (meta || stats) {
        const i = items.findIndex(x => x.Id === b.Id);
        if (i >= 0) items[i] = compact(meta, stats, b);
        fixed++;
      } else {
        stillFailing++;
      }
      if (done % 50 === 0 || done === need.length) {
        console.log(`[patch-missing] ${done}/${need.length} (fixed=${fixed} still-failing=${stillFailing})`);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));

  fs.writeFileSync(CATALOG, JSON.stringify({ at: Date.now(), items }));
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[patch-missing] done in ${dt}s — wrote ${items.length} items, fixed ${fixed}, still-failing ${stillFailing}`);
})().catch(e => { console.error(e); process.exit(1); });
