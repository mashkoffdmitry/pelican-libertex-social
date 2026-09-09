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

The catalog rebuilds every 6 h and already takes ~17 min: ~9 100 strategies ×
2 upstream calls each (`/{id}` and `/{id}/stats`) at concurrency 12, with 429
backoff. Adding both signals endpoints doubles the calls per strategy, so expect
roughly 3× the rebuild time and a materially higher chance of sustained 429s from
`papi.copy-trade.io` — all against a **single shared Libertex account**. The data
would also be stale on arrival: an open position can be closed long before the
6-hour-old catalog is replaced.

### Options

1. **Keep it live-only (status quo).** Trades stay behind an explicit click.
   Costs nothing, but every click is an upstream call on the shared account, and
   the proxy rate-limits at 120 req/min/IP. Fine for low traffic; not for a busy
   public page.
2. **A separate small dump.** Build a second, much smaller artifact — say the
   top 50 strategies by copiers — with open positions included, refreshed every
   10–15 min. ~100 upstream calls per refresh instead of ~18 000, so it can be
   frequent without threatening the main rebuild. Needs a new R2 key, a Worker
   route, and a rule for which strategies qualify.
3. **Bake into the main catalog.** Simplest to consume, worst on every other
   axis: ~3× rebuild time, higher 429 risk, a much larger payload, and data
   that is stale by construction. Not recommended.

### What would decide it

- Does the embedding site need trades on first paint, or is click-to-load fine?
- How many strategies actually need them — a curated few, or all of them?
- Expected concurrent readers, since that sets whether the shared account can
  absorb live calls at all.

Until those are answered, option 1 stands.
