# Диаграмма потока данных и фильтрации

## 1. Полный поток от источника до юзера

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  papi.copy-trade.io (Libertex Social)                                      │
│  └─ OAuth2 Bearer token (refreshed every 1h)                               │
│                                                                             │
└────────────────────────────┬────────────────────────────────────────────────┘
                             │
                    buildCatalog(token)
                             │
        ┌────────────────────┴────────────────────┐
        │                                         │
    [1a] Substring scan              [1b] Discover groups
    /api/strategies?filter=a          /api/discover/Strategies
    /api/strategies?filter=b          /api/discover/CopiersBalance
    ... (400+ requests)               /api/discover/GlobalSignals
    concurrency=5                     /api/discover/HighRisk
    ≈ 30-60 sec                       ... (20 groups)
    ≈ 2500-3000 items                 sequential, ≈ 20-30 sec
                                      ≈ 1100-2500 items
        │                             │
        └────────────────┬────────────┘
                         │
                  Deduplicate by ID
                         │
              Map<Id, base_item> 
              ≈ 10,000-12,000 entries
                         │
                    getCatalog()
                  TTL: 10 minutes
                         │
                         │
        ┌────────────────▼────────────────────────────────────────┐
        │                                                         │
        │              buildFull(token)                           │
        │           (triggered every 6 hours)                     │
        │                                                         │
        │  [2a] Collect discover metadata                         │
        │  ├─ Name, NumCopiers, Fee, RiskProfile, Profile        │
        │  ├─ Extract _returnRank from /api/discover/Return*     │
        │  └─ ≈ 2-3 sec                                          │
        │                                                         │
        │  [2b] Load previous catalog from disk                  │
        │  └─ Fallback chain: today's fetch → yesterday's data   │
        │                                                         │
        │  [2c] Sort by priority                                 │
        │  ├─ 1st: _returnRank (from discover)                   │
        │  └─ 2nd: NumCopiers (as tiebreaker)                    │
        │                                                         │
        │  [2d] PRE-FILL fullCache.partial                       │
        │  └─ Partial entries (without stats) — 35 MB            │
        │     ↓ Served to clients immediately on ?partial=1      │
        │                                                         │
        │  [2e] Parallel stats enrichment                         │
        │  ├─ concurrency=12                                     │
        │  ├─ For each strategy:                                 │
        │  │  ├─ GET /api/strategies/{id}                        │
        │  │  │  └─ Name, NumCopiers, Fee, RiskProfile, etc      │
        │  │  ├─ GET /api/strategies/{id}/stats                  │
        │  │  │  └─ Return%, MaxDD%, Trades, Markets, Balance    │
        │  │  └─ Exponential backoff if 429                      │
        │  ├─ ≈ 120-180 sec                                      │
        │  └─ Progress updated in fullCache.progress.loaded      │
        │     ↓ Polled by client every 2 sec                     │
        │                                                         │
        │  [2f] Final retry pass (for empty items)               │
        │  ├─ concurrency=6 (slower, more gentle)                │
        │  └─ ≈ 30-60 sec                                        │
        │                                                         │
        │  [2g] Save to disk + Upload to R2                      │
        │  └─ /tmp/.catalog.json + (optional) Cloudflare Worker  │
        │                                                         │
        └────────────────┬────────────────────────────────────────┘
                         │
                    fullCache.items
                  TTL: 6 hours (fresh)
                  TTL: ∞ (stale-while-revalidate)
                         │
        ┌────────────────┴──────────────────────────┐
        │                                           │
    [3] API endpoints (server.js)                   │
        │                                           │
    GET /api/strategies-full                        │
    ├─ Serve fullCache.items (fresh or stale)      │
    ├─ Add headers:                                │
    │  ├─ X-Catalog-Building: 1 (if rebuilding)   │
    │  ├─ X-Catalog-Size: 9123 (count)             │
    │  └─ Cache-Control: max-age=300               │
    ├─ Filter: IsEnabled !== false                 │
    └─ ≈ 25-35 MB gzipped → ~3-4 MB on wire       │
                         │
    GET /api/strategies-full?partial=1             │
    ├─ If items/partial exist → return immediately│
    ├─ If cold start (both null, building=true)   │
    │  └─ Return [] immediately (don't block)      │
    └─ Client retries every 2 sec                  │
                         │
    GET /api/strategies-full/progress              │
    ├─ Return:                                     │
    │  ├─ ready: bool                              │
    │  ├─ building: bool                           │
    │  ├─ loaded: N (current)                      │
    │  ├─ total: 10000 (expected)                  │
    │  └─ built_at: timestamp                      │
    └─ Polled every 2 sec during build            │
                         │
        └────────────────┬──────────────────────────┘
                         │
        ┌────────────────▼──────────────────────────┐
        │                                           │
        │   Browser/CDN Cache                       │
        │   └─ Respects Cache-Control: max-age=300 │
        │                                           │
        └────────────────┬──────────────────────────┘
                         │
        ┌────────────────▼──────────────────────────────────┐
        │                                                   │
        │  Vue 3 Component (PelicanLibertexSocial.vue)      │
        │                                                   │
        │  [4a] useCatalog()                                │
        │  ├─ Fetch /api/strategies-full                    │
        │  ├─ Store in shallowRef (reactive)                │
        │  ├─ On cold start: poll progress + partial load  │
        │  └─ enrichOne(id) on expand for extra data       │
        │                                                   │
        │  [4b] useFilters()                                │
        │  ├─ Input: catalog (Strategy[])                   │
        │  ├─ Output: filtered (computed<Strategy[]>)       │
        │  ├─ Apply all constraints:                        │
        │  │  ├─ f.search (substring in Name/Profile)      │
        │  │  ├─ f.risk (Risk checkbox)                    │
        │  │  ├─ f.retMin/retMax (Return% range)           │
        │  │  ├─ f.ddMax (Max Drawdown%)                   │
        │  │  ├─ f.aumMin (Copiers AUM)                    │
        │  │  ├─ f.copiersMin (NumCopiers)                 │
        │  │  ├─ f.tradesMin (Total trades)                │
        │  │  ├─ f.feeMax (Fee%)                           │
        │  │  ├─ f.winrateMin (Win rate%)                  │
        │  │  ├─ f.balanceMin/Max (Account Balance)        │
        │  │  ├─ f.ageMin (Inception date)                 │
        │  │  ├─ Exclude IsSimulated                       │
        │  │  └─ Exclude _stats=true && TradesTotal=0      │
        │  ├─ Complexity: O(n) where n=10k                 │
        │  └─ Runs in browser (~10ms on modern device)     │
        │                                                   │
        │  [4c] useSort()                                   │
        │  ├─ Sort by: Return (default), NumCopiers, Risk  │
        │  ├─ Complexity: O(n log n)                       │
        │  └─ ~150ms for 10k items                         │
        │                                                   │
        │  [4d] usePagination()                             │
        │  ├─ Split into pages of 20                        │
        │  ├─ Track current page, totalPages                │
        │  └─ O(1) to switch pages                         │
        │                                                   │
        │  [4e] StrategyTable (component)                   │
        │  ├─ Render page items (20 rows)                   │
        │  ├─ On row expand:                                │
        │  │  ├─ expandOne(id) → toggle Set                │
        │  │  └─ enrichOne(id) if not cached               │
        │  ├─ GET /api/strategies/{id} → meta              │
        │  ├─ GET /api/strategies/{id}/stats → enriched     │
        │  └─ Parallel allSettled() for robustness          │
        │                                                   │
        └────────────────┬──────────────────────────────────┘
                         │
                    User sees:
                    ├─ Filtered + sorted list
                    ├─ 20 rows per page
                    ├─ Search, Risk, Return%, etc. filters
                    ├─ Real-time updates as filters change
                    └─ Progress bar while initial catalog loads
```

---

## 2. Трёхслойная архитектура кеширования

```
Layer 1: Upstream API (papi.copy-trade.io)
         │
         ├─ 429 backoff: exponential, pauseUntil global
         ├─ Timeout: 20 sec
         └─ Retry: 4 attempts + final retry pass (6 attempts)
         
         │
         ▼
         
Layer 2: Proxy in-memory cache (server.js)
         │
         ├─ catalogCache { items, building, TTL: 10min }
         │  └─ Base catalog (IDs + names only)
         │
         ├─ fullCache { items, partial, building, TTL: 6h }
         │  ├─ items: complete enriched data
         │  └─ partial: in-progress data (useful for cold starts)
         │
         └─ Disk persistence (/tmp/.catalog.json)
            └─ Survives container restart, loads on startup
            
         │
         ▼
         
Layer 3: Browser/CDN cache
         │
         ├─ /api/strategies-full → Cache-Control: max-age=300
         └─ Browser reuses for 5 min (same-IP requests)
         
         │
         ▼
         
Layer 4: Client-side in-memory (Vue)
         │
         ├─ shallowRef<Strategy[]> (reactive)
         ├─ Computed filtered array (derivation, not fetched)
         └─ Computed sorted array (derivation, not fetched)
```

---

## 3. Фильтрация: Server vs. Client

```
┌────────────────────────────────────────────────────┐
│ SERVER-SIDE FILTERING (at build time)              │
├────────────────────────────────────────────────────┤
│                                                    │
│ • /api/strategies?filter=TERM                      │
│   └─ Returns strategies matching substring         │
│   └─ Used during buildCatalog() for discovery      │
│                                                    │
│ • IsEnabled filter                                 │
│   └─ Applied in /api/strategies-full endpoint      │
│   └─ Removes IsEnabled=false before response       │
│                                                    │
│ × Server does NOT filter by Risk, Return, etc.     │
│   → Would require separate endpoint per filter     │
│   → Not practical with 10k items + 12 filters      │
│                                                    │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│ CLIENT-SIDE FILTERING (real-time, in browser)      │
├────────────────────────────────────────────────────┤
│                                                    │
│ • Search: Name or Profile.Name contains q         │
│ • Risk: CheckboxGroup (Low/Medium/High)            │
│ • Return%: Dual-range slider (min-max)             │
│ • Drawdown%: Single range slider (max)             │
│ • Copiers AUM: Range                               │
│ • NumCopiers: Range                                │
│ • Trades: Minimum count                            │
│ • Win Rate%: Minimum %                             │
│ • Fee%: Maximum %                                  │
│ • Balance: Dual-range slider                       │
│ • Age: Minimum days since inception                │
│                                                    │
│ Complexity: O(n) per keystroke / slider change     │
│ n=10k → ≈10ms latency (imperceptible)             │
│                                                    │
│ Execution flow:                                    │
│ Raw catalog (10k) → filters.passes() → filtered    │
│                  → useSort() → sorted              │
│                  → usePagination() → page 1 of N   │
│                  → render 20 rows                  │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## 4. Сценарии нагрузки для 5k DAU

```
╔════════════════════════════════════════════════════════════╗
║ BASELINE (typical day, 5k DAU distributed)                 ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║ Concurrent users:         ~350 (peak 4h window)           ║
║ Request rate:             ~10 req/sec                     ║
║ Server CPU:               150m (20% of 750m limit)        ║
║ Server memory:            ~100 MB (20% of 512 MB)         ║
║ Upstream API calls:       Controlled by rebuild schedule  ║
║ Catalog age:              0-6 hours (rotating)            ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝

╔════════════════════════════════════════════════════════════╗
║ COLD START (server restart, no disk cache)                 ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║ Action: startup → getFull() kicks off                      ║
║                                                            ║
║ Clients meanwhile:                                         ║
║  1. GET /api/strategies-full?partial=1 @ 0s               ║
║     ├─ Response: [] (empty, with X-Catalog-Building:1)   ║
║     └─ Retry in 2s                                        ║
║                                                            ║
║  2. Substring scan @ 0-60s: first partial data available  ║
║     └─ GET /api/strategies-full?partial=1 @ 2-5s          ║
║        ├─ Response: ~2000 items (partial)                 ║
║        └─ Continue polling + filtering locally            ║
║                                                            ║
║  3. Stats enrichment @ 60-240s: fullCache.partial growing ║
║     └─ GET /api/strategies-full?partial=1 @ 5-60s         ║
║        ├─ Response: increments (4k → 6k → 8k → 10k)      ║
║        └─ Client sees more data arriving                  ║
║                                                            ║
║  4. Build complete @ 240s: fullCache.items = ready        ║
║     └─ GET /api/strategies-full @ 120s                    ║
║        ├─ Response: full 10k items                        ║
║        └─ Client may have already switched to full fetch  ║
║                                                            ║
║ Result: Users see Progressive Loading UX, not blank       ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝

╔════════════════════════════════════════════════════════════╗
║ REBUILD CYCLE (every 6 hours)                              ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║ At 14:00 (stale=6h):  Scheduler triggers getFull()        ║
║                        fullCache.building = Promise        ║
║                                                            ║
║ Users @ 14:00-14:04:  Still see old catalog (stale OK)    ║
║                        X-Catalog-Building: 0               ║
║                        X-Catalog-Built-At: 8:00 (6h old)  ║
║                                                            ║
║ @ 14:04:              buildFull completes                 ║
║                        fullCache.items = new data          ║
║                        fullCache.at = now                  ║
║                                                            ║
║ Next request:         fresh data served                   ║
║                        Cache-Control: max-age=300          ║
║                        X-Catalog-Built-At: 14:04           ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

---

## 5. Данные текущие для принятия решений

```
╔═══════════════════════════════════════════════════════════════╗
║ Metric                      │ Current    │ At 5k DAU (est.)  ║
╠═══════════════════════════════════════════════════════════════╣
║ Catalog size                │ ~10-12k    │ ~10-12k (stable) ║
║                             │ strategies │                   ║
║────────────────────────────────────────────────────────────────║
║ Full rebuild time           │ 3-5 min    │ 3-5 min (no ∆)   ║
║────────────────────────────────────────────────────────────────║
║ Rebuild frequency           │ every 6h   │ every 6h (safe)  ║
║                             │ 4/day      │                   ║
║────────────────────────────────────────────────────────────────║
║ Upstream req/day            │ ~40k       │ ~50k (20% ↑)     ║
║────────────────────────────────────────────────────────────────║
║ Memory per pod              │ ~100 MB    │ ~100 MB (no ∆)   ║
║────────────────────────────────────────────────────────────────║
║ Disk (catalog.json)         │ 25 MB      │ 25 MB (no ∆)     ║
║────────────────────────────────────────────────────────────────║
║ CPU at baseline             │ 100m       │ 200m (2x)        ║
║────────────────────────────────────────────────────────────────║
║ CPU during rebuild          │ 300m       │ 350m             ║
║────────────────────────────────────────────────────────────────║
║ Bandwidth out (to users)    │ ~500 GB/mo │ ~1.8 GB/day      ║
║                             │ (estimate) │ (~54 GB/mo)      ║
║────────────────────────────────────────────────────────────────║
║ Bandwidth out (upstream)    │ ~1.2 MB/h  │ ~1.4 MB/h (flat) ║
║                             │ (rebuild)  │                   ║
║────────────────────────────────────────────────────────────────║
║ Rate limit (120 req/min)    │ OK         │ OK if IPs spread ║
║                             │ tests      │                   ║
╚═══════════════════════════════════════════════════════════════╝

✅ Green flags: Memory, CPU, Bandwidth, Disk all have 10x+ margin
⚠️  Yellow flags: Upstream 429 risk if Libertex has hidden quotas
❌ No red flags found for 5k DAU scale
```

---

## 6. Быстрые улучшения для 5k DAU (приоритет)

```
WEEK 1 (No code changes, just config + monitoring)
├─ 1. Add /metrics endpoint
│  └─ Track rebuild time, upstream errors, rebuild count
│  └─ Alert if rebuild takes >10min (throttling sign)
│
├─ 2. Increase RATE_LIMIT
│  └─ From 120 → 300 req/min/IP
│  └─ Safe buffer for 5k users
│
└─ 3. Capture rebuild + throttling events
   └─ Log pauseUntil triggers
   └─ Alert if 429 seen >3× per rebuild

WEEK 2 (Low-risk code changes)
├─ 4. Adaptive poll interval (Progress bar)
│  └─ Current: fixed 2sec
│  └─ Proposed: 2sec early → 5sec late
│  └─ Impact: 60% fewer progress requests
│
├─ 5. Client-side dedup on search
│  └─ Filter() locally first, only call API if <50 results
│  └─ Impact: 50% fewer search API calls
│
└─ 6. Extend rebuild interval on throttling
   └─ If upstream failures > 20% → 6h → 8h
   └─ Impact: Graceful degradation under pressure

WEEK 3+ (If needed after Week 1-2 monitoring)
├─ 7. Incremental catalog updates
│  └─ Instead of full rebuild every 6h → delta every 30min
│  └─ Impact: Data freshness 6h → 30min, same upstream load
│
└─ 8. Discover groups batching
   └─ Already fetching /api/discover (has all groups)
   └─ Reuse results, don't fetch per-group
   └─ Impact: 15 sec faster rebuilds
```
