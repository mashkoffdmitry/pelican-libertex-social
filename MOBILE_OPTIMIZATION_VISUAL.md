# Визуальный справочник: Откуда данные и как работает на мобильных

## 1. ОТКУДА ДАННЫЕ В VUE WIDGET? (Два варианта)

### Вариант A: Простой (только proxy)

```
User's device
    │
    │ GET /api/strategies-full
    │ (или ?partial=1 при cold start)
    │
    ▼
┌─────────────────────────────────┐
│  labs-pelican-proxy.mctl.ai     │
│  (server.js на Kubernetes)       │
├─────────────────────────────────┤
│ in-memory cache:                │
│ ├─ fullCache.items (35 MB)      │
│ ├─ fullCache.partial (during)   │
│ └─ catalogCache (10 min TTL)     │
├─────────────────────────────────┤
│ API routes:                     │
│ ├─ /api/strategies-full         │
│ ├─ /api/strategies-full/progress│
│ ├─ /api/strategies/{id}         │
│ └─ /api/strategies/{id}/stats   │
└──────────┬──────────────────────┘
           │
           ▼
        Upstream
      papi.copy-trade.io
      (через OAuth token)
```

**Путь данных:**
```
papi.copy-trade.io (источник)
    ↓ (1x в 6 часов, rebuild)
server.js fullCache
    ↓ (постоянно, клиенты запрашивают)
Браузер пользователя
    ↓ (гражданского процесса)
Vue component (фильтрует в памяти)
```

### Вариант B: Гибридный (РЕКОМЕНДУЕТСЯ для мобильных)

```
User's device
    │
    ├─ GET /api/strategies-full
    │  (catalogBase = R2 Worker)
    │
    ├─ GET /api/strategies/{id}
    │  (apiBase = proxy)
    │
    └─ GET /api/strategies/{id}/stats
       (apiBase = proxy)
    
    │
    ├────────────────┬────────────────┐
    │                │                │
    ▼                ▼                ▼
┌──────────────┐ ┌─────────────┐ ┌────────────┐
│ Cloudflare   │ │ Proxy       │ │ Upstream   │
│ Worker       │ │ (server.js) │ │            │
│ (R2 bucket)  │ │             │ │ papi.cti   │
├──────────────┤ │ ├─ /api     │ │            │
│              │ │ │ /strat    │ │            │
│ Catalog:     │ │ │ /{id}     │ │            │
│ ├─ All 10k   │ │ │ /stats    │ │            │
│ │ strategies │ │ │           │ │            │
│ │ (static)   │ │ └─ live    │ │            │
│ │ 3-4 MB gz  │ │   per-     │ │            │
│ │            │ │   strategy │ │            │
│ └─ Updated   │ │   data     │ │            │
│   every 6h   │ │            │ │            │
│              │ │ Cache:     │ │            │
│ Cache: 1h    │ │ 5 min      │ │            │
│ Location:    │ │ TTL        │ │            │
│ Global edge  │ │            │ │ OAuth token│
│ (nearest)    │ │ No compute │ │ Cached     │
│              │ │ Just cache │ │            │
└──────────────┘ └─────────────┘ └────────────┘
     ▲                ▲
     │                │
     └────ишь in 6h ──┘
        r2-uploader.js
      (after rebuild)
```

**Путь данных (гибридный):**
```
papi.copy-trade.io
    ↓ [каждые 6 часов]
server.js buildFull()
    ├─ fullCache.items (в памяти)
    └─ /tmp/.catalog.json (на диск)
         ↓ [async upload]
    R2 bucket (Cloudflare edge)
    
    ↓ [клиент запрашивает]
User's мобильное устройство
    ├─ GET /api/strategies-full
    │  → Cloudflare Worker (nearest edge)
    │  → R2 bucket (3-4 MB gz)
    │  → Браузер (cache 1 hour)
    │
    └─ GET /api/strategies/{id}/stats
       → Proxy server.js
       → Upstream (fresh per-strategy data)
       → Браузер (cache 5 min)
```

**Почему гибридный лучше:**
```
Latency сравнение:

Simple proxy:
  User → (300-500ms) → Proxy → Response
  
Hybrid (R2):
  User → (100-200ms) → Cloudflare edge → Response
         (ближайший географически)
         
  Per-strategy:
  User → (300-500ms) → Proxy → Upstream → Response
         (live data, не может быть от edge)
```

---

## 2. TIMELINE: МОБИЛЬНЫЙ ПОЛЬЗОВАТЕЛЬ ОТКРЫВАЕТ ПРИЛОЖЕНИЕ

### 4G LTE (хорошо, 20 Mbps, 50ms latency)

```
TIME  │ ACTION                    │ NETWORK    │ USER SEES
──────┼──────────────────────────┼────────────┼──────────────
0ms   │ User clicks link          │            │ Loading...
      │ Browser starts loading    │            │
──────┼──────────────────────────┼────────────┼──────────────
100ms │ HTML arrives             │ 100KB/300ms│ Blank (rendering)
      │ JS + CSS parsing         │            │
──────┼──────────────────────────┼────────────┼──────────────
900ms │ Vue mounts               │            │ Empty page
      │ onMounted() → catalog.   │            │
      │ start()                  │            │
──────┼──────────────────────────┼────────────┼──────────────
950ms │ GET /api/strategies-full?│ 0.2 KB req │ Progress bar
      │ partial=1 (cold start)   │            │ "Refreshing..."
──────┼──────────────────────────┼────────────┼──────────────
1050ms│ 202 Response: []          │ 0.1 KB     │ Still refreshing
      │ (empty, but building=1)  │            │ 0% complete
──────┼──────────────────────────┼────────────┼──────────────
3050ms│ Poll: /api/strategies-   │ Progress   │ Progress bar:
      │ full/progress            │ response   │ 20% (2k/10k)
──────┼──────────────────────────┼────────────┼──────────────
5050ms│ Poll: GET /api/strategies│ 0.2KB req  │ Progress bar
      │ -full?partial=1 again    │            │ Try again...
      │                          │            │
      │ buildFull() finished     │ 3-4 MB gz  │
      │ partial data available   │ download   │
──────┼──────────────────────────┼────────────┼──────────────
5200ms│ 2MB partial data         │ 2MB ÷      │ LIST APPEARS!
      │ arrives after download   │ 20Mbps     │ ~2000 items
      │                          │ = 0.8s     │ with Return%, Risk
──────┼──────────────────────────┼────────────┼──────────────
5400ms│ useFilters() runs        │            │ Filtered list
      │ useSort() runs           │ Local JS   │ shown
      │ Vue renders page 1       │ (10-150ms) │
──────┼──────────────────────────┼────────────┼──────────────
6000ms│ User can scroll/filter   │            │ INTERACTIVE ✅
      │ changes trigger reactive │            │ (even though
      │ updates locally          │            │ not all data yet)
──────┼──────────────────────────┼────────────┼──────────────
10000m│ buildFull() completes    │ 3-4 MB gz  │ Still showing
s     │ Full 10k items available │ download   │ partial list
      │                          │ = 1.2s     │
──────┼──────────────────────────┼────────────┼──────────────
11200m│ Full catalog arrives     │            │ FULL LIST
s     │ useFilters/Sort redone   │ Local JS   │ shows all 10k
      │ Page 1 refreshed         │            │ items ✅
──────┼──────────────────────────┼────────────┼──────────────
SUMMARY:
├─ User sees UI (progress bar): 900ms ✅
├─ User sees list (partial): 5-6 sec ✅✅
├─ User can interact: 6 sec ✅✅
├─ Full list ready: 11-12 sec ✅
└─ Total perceived: ~6-7 sec (because interactive from partial)
```

### 4G LTE (плохо, 5 Mbps, 200ms latency)

```
TIME   │ ACTION                    │ NETWORK   │ USER SEES
───────┼──────────────────────────┼───────────┼──────────────
0-1s   │ HTML/JS load             │ ~500KB    │ Loading...
──────┼──────────────────────────┼───────────┼──────────────
1s    │ Vue mounts               │           │ Progress bar
      │ GET /api/strategies-full │           │ "Refreshing"
      │ ?partial=1               │           │
──────┼──────────────────────────┼───────────┼──────────────
3s    │ Empty response []         │ 0.1 KB    │ Still loading...
      │ Poll progress again      │ Poll      │
──────┼──────────────────────────┼───────────┼──────────────
7s    │ Partial data available   │ 2 MB      │ Download starts
      │ (after 3-4s rebuild      │ ÷ 5 Mbps  │
      │ in parallel)             │ = 3.2s    │
──────┼──────────────────────────┼───────────┼──────────────
10s   │ Partial data arrives     │ Complete  │ LIST APPEARS! ✅
      │ useFilters/Sort          │ (5 MB)    │ ~2000 items
──────┼──────────────────────────┼───────────┼──────────────
13s   │ User can interact        │           │ INTERACTIVE ✅
──────┼──────────────────────────┼───────────┼──────────────
20s   │ Full rebuild done        │ 3-4 MB    │ Download full
      │ Full catalog available   │ ÷ 5 Mbps  │ starts
      │                          │ = 4.8s    │
──────┼──────────────────────────┼───────────┼──────────────
25s   │ Full data arrives        │ Complete  │ FULL LIST ✅
      │ All 10k items            │           │ (if user
      │                          │           │ waited that long)
──────┼──────────────────────────┼───────────┼──────────────
SUMMARY:
├─ User sees UI: 1s ✅
├─ User sees partial list: 10-12s ⚠️ (getting impatient)
├─ User can interact: 13s ⚠️
├─ Full list: 25s (too long, most users left)
└─ Optimization needed for this network: Priority 1
```

### 3G (1 Mbps, 400ms latency)

```
TIME    │ ACTION                    │ NETWORK   │ USER SEES
────────┼──────────────────────────┼───────────┼──────────────
0-1s    │ HTML/JS load             │ ~500KB    │ Loading
────────┼──────────────────────────┼───────────┼──────────────
1s      │ Vue mounts, GET partial  │           │ Progress bar
────────┼──────────────────────────┼───────────┼──────────────
4s      │ Empty response           │ 0.1 KB    │ Waiting...
        │ Poll progress            │ Poll      │
────────┼──────────────────────────┼───────────┼──────────────
20s     │ Partial data available   │ 2 MB      │ Download starts
        │ (rebuild finished)       │ ÷ 1 Mbps  │
        │                          │ = 16s     │
────────┼──────────────────────────┼───────────┼──────────────
36s     │ Partial arrives          │ Complete  │ LIST APPEARS!
        │ User might've given up   │           │ (late for UX)
        │                          │           │ ❌ UNACCEPTABLE
────────┼──────────────────────────┼───────────┼──────────────
60s     │ Full rebuild done        │ 3-4 MB    │ Download full
        │                          │ ÷ 1 Mbps  │ starts
        │                          │ = 32s     │
────────┼──────────────────────────┼───────────┼──────────────
92s     │ Full data arrives        │ Complete  │ FULL LIST
        │ (1.5 minutes!)           │           │ ❌ UNUSABLE
────────┼──────────────────────────┼───────────┼──────────────
SUMMARY:
├─ User sees list: 36s ❌ (gave up at 15-20s)
├─ Full list: 92s ❌ (left the app)
└─ NEEDS OPTIMIZATION for 3G
```

---

## 3. ОПТИМИЗАЦИИ ДЛЯ МЕДЛЕННЫХ СЕТЕЙ (Сравнение)

### Текущий подход (3G user):

```
GET /api/strategies-full (полные 35 MB)
    │
    ├─ Gzipped: 3-4 MB
    │  Download on 3G: 32 сек
    │  User waits: 36+ сек total ❌
    │
    └─ Full JSON parse + render: 500ms
```

### Оптимизация 1: Essential-only fields (EASY)

```
GET /api/strategies-full?fields=essential
    │
    ├─ Only: Id, Name, Return%, Risk, NumCopiers
    │  Raw: 0.5 MB
    │  Gzipped: 0.1 MB
    │
    ├─ Download on 3G: 0.8 сек
    │  Total perceived: 4 сек ✅✅ (vs 36 сек)
    │
    └─ JSON parse + render: 50ms
         ↓
    User sees list in 4-5 сек (ACCEPTABLE)
    
    Meanwhile (async, non-blocking):
    GET /api/strategies-full (full)
    └─ Downloads in background
       Complete after 32 more secs
       User sees full data update without reload
```

### Оптимизация 2: Network Information API (SMART)

```
const connection = navigator.connection;
const speed = connection.effectiveType; // '4g', '3g', '2g'

if (speed === '3g' || speed === '2g') {
  // Auto-fetch essential only
  catalog = await fetch('/api/strategies-full?fields=essential');
} else {
  // Fetch full
  catalog = await fetch('/api/strategies-full');
}
```

**Result:** User on 3G auto-gets 4-sec list instead of 36-sec blank page ✅

### Оптимизация 3: Field aliasing (SHORT KEYS)

```
Before:
{
  "Id": 123,
  "Name": "Strategy X",
  "Return": 45.2,
  "MaxDD": -12.3,
  "NumCopiers": 5432,
  // ... 15+ fields
}
→ 2.5 KB per item × 10000 = 25 MB

After (with aliases):
{
  "i": 123,      // Id
  "n": "Strat X",
  "r": 45.2,     // Return
  "d": -12.3,    // MaxDD
  "c": 5432,     // NumCopiers
  // ... 15+ fields (short)
}
→ 1.5 KB per item × 10000 = 15 MB (40% smaller!)
→ Gzipped: 1.5-2 MB
→ 3G download: 12 сек (vs 32 сек)
```

---

## 4. BROWSER CACHE MAGIC (повторный запрос)

```
USER OPENS FIRST TIME (cold cache)
├─ GET /api/strategies-full
├─ Server response: 3-4 MB gzipped
├─ Browser cache: max-age=300 (5 min)
└─ Total: 5-10 sec

USER NAVIGATES AWAY, COMES BACK (within 5 min)
├─ GET /api/strategies-full
├─ Browser checks: cache-control: max-age=300
├─ Checks timestamp: < 5 min elapsed ✓
├─ Returns from memory (no network!)
├─ Network time: 0 ms (instant!)
├─ Total: < 1 sec ✅
│
│ On 4G:  200ms latency → but cache hit → 0 latency!
│ On 3G:  400ms latency → but cache hit → 0 latency!
│ Saving: ~10-30 сек per reload
```

**KEY INSIGHT:**
```
Second visit is INSTANT regardless of network speed
Because Cache-Control: max-age=300 tells browser
to reuse data from memory without network request
```

---

## 5. R2 WORKER (EDGE OPTIMIZATION)

### Без R2 (все через proxy в центре data center):

```
User location: Tokyo
User's network: 4G, 20ms local latency
Request path:
    Tokyo → Undersea cable → US data center → Libertex
    Latency: 100ms one-way
    Total RTT: 200ms
    Download: 0.5 MB gzipped → 200ms
    Total: ~400ms
```

### С R2 Worker (через Cloudflare edge):

```
User location: Tokyo
User's network: 4G, 20ms local latency
Request path:
    Tokyo → Cloudflare edge (Tokyo) → R2 bucket (US)
    Latency: 20ms to edge
    Data served from cache (1 hour TTL)
    Download: 0.5 MB from local edge → 100ms
    Total: ~120ms

Savings: 400ms → 120ms (3x faster!)
More important on slow networks:
    3G 400ms latency
    Edge + cache: 20ms to edge + 100ms data = 120ms
    vs center: 400ms latency + 1600ms data = 2000ms
    Savings: 17x faster!
```

---

## 6. PAYLOAD SIZE COMPARISON

```
┌──────────────────────┬─────────┬──────────┬──────────┐
│ Approach             │ Raw     │ Gzipped  │ 3G Time  │
├──────────────────────┼─────────┼──────────┼──────────┤
│ Current (full)       │ 25 MB   │ 3-4 MB   │ 32 sec   │
│                      │         │          │          │
│ Essential-only       │ 0.5 MB  │ 0.1 MB   │ 0.8 sec  │
│ (fields=essential)   │         │          │ ✅✅     │
│                      │         │          │          │
│ Full + aliasing      │ 15 MB   │ 2 MB     │ 16 sec   │
│ (short keys)         │         │          │ ✅       │
│                      │         │          │          │
│ Essential + alias    │ 0.3 MB  │ 0.05 MB  │ 0.4 sec  │
│ (BEST)               │         │          │ ✅✅✅   │
└──────────────────────┴─────────┴──────────┴──────────┘

Progressive approach (RECOMMENDED):
1. Fetch essential (0.4 sec)
2. User sees list
3. Fetch full (async, 16 sec)
4. Background update (seamless)

3G UX: 0.4s list + 16s full data vs 32-36s blocking
       User happy at 0.4s, doesn't care about 16s background
```

---

## 7. DECISION MATRIX: What to do?

```
┌─────────────────────────────────────────────────────────┐
│ TARGET AUDIENCE                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ DEVELOPED COUNTRIES (4G+ dominant, 90%+ users)         │
│ ├─ Beispiel: US, UK, Japan, Australia                  │
│ │                                                       │
│ └─ What to do:                                          │
│    ✅ Deploy as-is (gzip works, partial loading ready) │
│    ✅ Enable R2 Worker (nice latency improvement)      │
│    ❌ Don't optimize for 3G (waste of time)            │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ MIXED (4G/3G, 50/50)                                    │
│ ├─ Beispiel: India, Brazil, Mexico                      │
│ │                                                       │
│ └─ What to do:                                          │
│    ✅ Implement essential-only payload (week 1)        │
│    ✅ Add Network Information API (week 2)             │
│    ⏳ Field aliasing if 3G complaints grow (week 4+)   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ EMERGING MARKETS (3G dominant)                          │
│ ├─ Beispiel: Nigeria, Pakistan, Bangladesh              │
│ │                                                       │
│ └─ What to do:                                          │
│    🚨 MUST implement essential-only FIRST              │
│    🚨 MUST add Network Information API detection       │
│    🚨 Field aliasing (40% savings)                     │
│    🚨 Service Worker (offline fallback)                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 8. QUICK REFERENCE: Implementation Effort

```
┌─────────────────────────────┬──────────┬──────────┬────────┐
│ Optimization                │ Effort   │ Impact   │ Risk   │
├─────────────────────────────┼──────────┼──────────┼────────┤
│ Enable R2 Worker            │ 10 min   │ 3x fast  │ None   │
│ (just wiring)               │ (config) │ latency  │        │
│─────────────────────────────┼──────────┼──────────┼────────┤
│ Gzip already works          │ 0 min    │ 8x size  │ None   │
│ (built-in, verify)          │ (check)  │ reduction│        │
│─────────────────────────────┼──────────┼──────────┼────────┤
│ Progressive partial load    │ 0 min    │ 6+ sec   │ None   │
│ (already implemented)       │ (exists) │ UX      │        │
│─────────────────────────────┼──────────┼──────────┼────────┤
│ Essential-only API          │ 2-3 hrs  │ 40x for  │ Low    │
│ (/fields=essential)         │          │ 3G      │        │
│─────────────────────────────┼──────────┼──────────┼────────┤
│ Network Information API      │ 1-2 hrs  │ Auto-   │ Low    │
│ (adapt to connection)       │          │ optimize│        │
│─────────────────────────────┼──────────┼──────────┼────────┤
│ Field aliasing              │ 4-5 hrs  │ 40% JSON│ Medium │
│ (short keys)                │          │ size    │        │
│─────────────────────────────┼──────────┼──────────┼────────┤
│ Service Worker              │ 4-6 hrs  │ Offline │ Medium │
│ (offline cache)             │          │ support │        │
│─────────────────────────────┼──────────┼──────────┼────────┤
│ Brotli compression          │ 1-2 hrs  │ 20% vs  │ Low    │
│ (instead gzip)              │          │ gzip    │        │
└─────────────────────────────┴──────────┴──────────┴────────┘

QUICK WINS (< 1 hour total):
✅ Enable R2 Worker
✅ Verify gzip working
✅ Check Cache-Control headers

WEEK 1 (if 3G users appear):
✅ Essential-only API endpoint
✅ Network Information API detection

WEEK 2+ (if needed):
⏳ Field aliasing
⏳ Service Worker
```

---

## 9. FINAL SUMMARY TABLE

```
┌──────────────┬──────────────────────┬──────────┬──────────┐
│ Network      │ Current Performance  │ With     │ With All │
│              │                      │ R2       │ Opts     │
├──────────────┼──────────────────────┼──────────┼──────────┤
│ 5G           │ 3-5 sec ✅✅✅       │ 2-3 sec  │ 1-2 sec  │
│              │ (already excellent)  │          │          │
│──────────────┼──────────────────────┼──────────┼──────────┤
│ 4G good      │ 5-7 sec ✅✅        │ 3-4 sec  │ 2-3 sec  │
│              │ (good)               │ ✅✅     │ ✅✅✅   │
│──────────────┼──────────────────────┼──────────┼──────────┤
│ 4G bad       │ 12-15 sec ✅        │ 8-10 sec │ 4-5 sec  │
│              │ (noticeable)         │ ✅       │ ✅✅     │
│──────────────┼──────────────────────┼──────────┼──────────┤
│ 3G           │ 35-40 sec ❌        │ 20-25    │ 4-5 sec  │
│              │ (unacceptable)       │ sec ⚠️   │ ✅✅     │
│              │                      │ (better) │ (fixed!) │
└──────────────┴──────────────────────┴──────────┴──────────┘

Legend:
✅✅✅ Excellent (< 5 sec)
✅✅ Good (5-10 sec)
✅ Acceptable (10-20 sec)
⚠️ Marginal (20-35 sec)
❌ Unacceptable (> 35 sec)
```
