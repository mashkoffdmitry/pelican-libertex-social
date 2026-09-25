# Roadmap — open decisions

Design questions that are deliberately unresolved. Each one records what is true
today, the options, and what would have to be known to pick one — so the next
person doesn't rediscover the trade-off from scratch.

## Individual trades are not in the catalog

**Status:** open. No work planned until a consumer actually needs it.

### What the catalog has today

`GET /api/strategies-full` carries per-strategy *aggregates* only:

| Field | Meaning |
|---|---|
| `TradesTotal`, `Wins`, `Losses` | lifetime counters |
| `Markets` | `[{ n: instrument, c: trade count }]`, top 12 |
| `History` | equity curve, up to 60 `{ Timestamp, AccountReturn }` points |

There is no open position and no closed trade in any form — no entry price, size,
open time, or per-trade P/L. Those come only from the proxy, live:

```
GET /api/strategies/{id}/signals/open      # positions open right now
GET /api/strategies/{id}/signals/closed    # closed in the last 30 days
```

The bundled Vue widget already works this way: expanding a row renders entirely
from catalog data with zero proxy calls, and only the **Open Trades** /
**Trade History** buttons hit the proxy (measured ~560 ms per call).

### Why they aren't baked in

Measured on production, 2026-09-25:

| | |
|---|---|
| Catalog rows | 3 125 scanned, 1 338 enabled (served) |
| Last rebuild | 652 s (~11 min), every 6 h |
| Upstream calls per rebuild | ~4 500: `/{id}` for all rows, `/{id}/stats` only for enabled ones (known-disabled rows skip stats) |
| Enabled catalog on the Worker | ~3.4 MB |
| Open positions, 4 most-copied strategies | 0–29 rows, up to 11 KB per strategy |
| Closed trades (30 days), same 4 | 9–1 093 rows, 4–480 KB per strategy |
| Live signals call via the proxy | 0.35–0.7 s |

Adding both signals endpoints for the enabled rows is ~+2 700 calls per rebuild,
so ~11 → ~18 min (about 1.6× — an earlier estimate of "3×" was made against a
9 100-row catalog that fetched stats for every row). Rebuild time is not the real
blocker; lag and payload are:

- **Lag.** Data a user sees is the rebuild interval + build time + the Worker's
  1 h edge cache: about 3.5 h on average, ~7.5 h at worst. Open positions can
  close within minutes, so baked-in positions would be wrong by construction.
- **Payload.** 30-day closed trades run to hundreds of KB for an active strategy;
  across 1 338 strategies that is tens of MB instead of 3.4 MB on first paint.
- **Account.** Every extra call lands on the same shared login — see the next
  section.

### Options

| Option | Lag for the user | Load on the account | Payload |
|---|---|---|---|
| 1. Live on click (status quo) | ≤ 15 s proxy cache + ~0.5 s | grows with visitors, no ceiling | 0–480 KB per click |
| 2. Separate open-positions dump every 15 min | ~15–20 min | ~1 338 calls / 15 min ≈ 1.5 req/s, constant | a few MB, own R2 key |
| 3. Bake into the 6-hour catalog | ~3.5 h avg, ~7.5 h worst | +2 700 calls per rebuild | tens of MB |

1. **Keep it live-only (status quo).** Trades stay behind an explicit click.
   Costs nothing, but every click is an upstream call on the shared account, and
   the proxy rate-limits at 120 req/min/IP. Fine for low traffic; not for a busy
   public page.
2. **A separate open-positions dump.** A second artifact with open positions for
   the enabled strategies (or a curated subset, e.g. the top 50 by copiers —
   ~100 calls per refresh), refreshed every 10–15 min, edge-cached for a few
   minutes. Closed trades stay on click. Needs a new R2 key, a Worker route, a
   refresh loop separate from the 6-hourly rebuild, and a rule for which
   strategies qualify. **This is the candidate for making trades mainstream**,
   but its constant load only makes sense once the catalog has its own service
   account (below).
3. **Bake into the main catalog.** Simplest to consume, worst on every other
   axis: stale by hours, tens of MB, more 429 exposure. Not recommended.

### What would decide it

- Does the embedding site need trades on first paint, or is click-to-load fine?
- How many strategies actually need them — a curated few, or all of them?
- Expected concurrent readers, since that sets whether the shared account can
  absorb live calls at all.
- Whether a service account (next section) exists to carry a constant refresh.

Until those are answered, option 1 stands.

## One personal Libertex login carries all traffic

**Status:** open. Risk, not a feature request.

`identity.copy-trade.io` and `papi.copy-trade.io` are not run by Libertex. They are
the shared white-label copy-trading platform of **Pelican** — the vendor, not this
project — (Pelican Exchange Ltd,
UK 09437275; Pelican Exchange Europe (CY) Ltd, CySEC 441/24). Libertex is one
tenant on it (`client_id=libertexweb`, `acr_values=tenant:Libertex`), alongside
Axi, IC Markets, Pepperstone, Vantage, Titan FX and others. The proxy logs in with
a Libertex-tenant user and reads the Pelican API.

### What is true today

- Production's 6-hourly rebuild and every visitor's live click (signals,
  per-strategy refresh, search) use the same access token, minted by
  `refresher.js` from one personal login (`LIBERTEX_EMAIL`). Staging has its own
  secret path (`teams/labs/pelican-proxy-staging`); whether it holds the same
  login is not recorded here.
- Pelican does not publish a rate limit for `papi.copy-trade.io`, and it is
  most likely shared across all broker tenants, so the headroom is unknown.
- The limit is real and we hit it on every rebuild. The first rebuild with
  logging (2026-09-25 14:57 UTC, production alone, concurrency 12) got
  **189 × 429**, paused ~30 s roughly every 35 s and still finished complete
  (3 126 rows, `stats-err=0`, 467 s). That rebuild had no disk catalog, so it
  fetched `/stats` for all 3 126 rows instead of ~1 340.
  The next one (21:16 UTC, after #18, seeded from R2) skipped `/stats` for
  1 791 disabled rows and made no 400 calls, yet still got **170 × 429**
  (3 124 rows, `stats-err=0`, 463 s). Fewer calls barely moved the 429 count:
  the throttle is on the request rate, not the total, so the lever is
  concurrency, not call volume.
- A deploy restarts the pod and kills a rebuild in progress; the new pod starts
  it again from scratch. On 2026-09-25 two back-to-back deploys (21:11, 21:15)
  made the due rebuild run three times, each attempt drawing its own 429s.
- Live calls have no shared budget. The proxy caps each visitor IP at
  120 req/min and caches each URL (15 s for signals), so upstream load scales
  with the number of visitors.
- On a 429 the rebuild backs off (`upstreamGetRetry` + global `pauseUntil`), but
  the live `/api/*` passthrough does not consult `pauseUntil` and returns the 429
  to the browser. During a heavy rebuild users can see trade lists fail.
- A block or password change on that login stops the catalog and live data
  together.
- Upstream search changed without notice: `filter` shorter than 3 characters →
  400, and every search returns at most 50 rows. The catalog therefore rests on
  the ~20 `/api/discover/*` groups; the 12 remaining scan terms add ~425 rows
  (22 enabled) that the groups miss.

### Incident, 2026-09-25

At 02:33 UTC staging and production started their rebuild 23 s apart. The second
one (production) lost all discover calls, built 592 rows instead of 3 124 and
pushed them to R2; the widget served the short catalog from 02:45 to 08:56. At
14:06 an anonymous request to `/api/strategies-all` ran the substring scan: ~290
upstream calls from our account, 254 of them 400. Neither showed a status code in
the logs, because upstream errors were swallowed.

### Already done

- **#16** — shrink guard (a rebuild under 80 % of the previous row count is
  dropped and retried in 30 min, never uploaded); upstream errors counted by
  status and logged, exposed as `/__status.upstream_errors`; staging is read-only
  (`APP_ENV=staging`: no rebuilds, re-seed from R2 every 30 min).
- **#18** — `/api/strategies-all` is built from the catalog, never from an
  upstream scan; the scan keeps only the 12 terms of ≥3 characters; live filters
  under 3 characters are answered by the proxy; the R2 seed is persisted to disk
  so the first rebuild after a deploy skips `/stats` for known-disabled rows.

What is left is the account itself: one personal login, an unknown limit, and
429s on every rebuild.

### Options

1. **Dedicated service account for the rebuild**, separate from any personal
   login. Isolates the heaviest, most predictable load.
2. **Second account (or a small pool) for live visitor traffic**, so a rebuild's
   429s cannot break clicks and the other way round. Requires the proxy to hold
   two tokens (two refresher loops or one loop with two credential sets).
3. **Official partner access from Pelican** (with Libertex as the tenant) with a
   documented quota — the only
   option that turns "unknown headroom" into a number.
4. **Check the terms.** Automated access under a personal user must be checked
   against Pelican's published terms (`docs.pelicantrading.io`) before scaling it.
5. **Meanwhile, in the proxy:** a global upstream budget for live calls and a
   short queue that honours `pauseUntil` instead of passing 429 through; try a
   lower `CATALOG_BUILD_CONCURRENCY` (6–8 instead of 12) and compare the 429 count
   in `/__status.upstream_errors.build` over the next rebuilds.

Option 1 is the prerequisite for option 2 of the trades decision above.
