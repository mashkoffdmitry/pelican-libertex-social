# Резюме: Масштабируемость на 5k DAU

## TL;DR

**Вопрос:** Сможет ли этот виджет + прокси обслуживать 5k пользователей ежедневно?

**Ответ:** ✅ **Да, может.** Все компоненты имеют 6-15x запас прочности. 

**Главное узкое место:** Libertex Social API throttling (429) во время rebuild фаз.

**Решение:** Адаптивная частота rebuild + мониторинг.

---

## Как это работает сейчас (В ДВУХ СЛОВАХ)

```
Libertex API (10k+ стратегий)
  ↓ [парсер: substring scan + discover groups]
  ↓ [3-5 мин сборка с параллельной загрузкой stats]
  ↓
Server.js кеш (в памяти + на диск)
  ├─ fullCache.items (10k стратегий, fresh 6h)
  ├─ fullCache.partial (in-progress data, для cold start)
  └─ /tmp/.catalog.json (persists restart)
  ↓
API endpoints (/api/strategies-full, /api/strategies-full/progress)
  ├─ Gzip compression (35 MB → 3-4 MB on wire)
  ├─ Browser cache (5 min, Cache-Control: max-age=300)
  └─ Cool trick: ?partial=1 для cold start (не блокирует)
  ↓
Vue компонент (PelicanLibertexSocial.vue)
  ├─ Fetch каталог один раз
  ├─ useFilters() — фильтрует в памяти (O(n), ~10ms)
  ├─ useSort() — сортирует (O(n log n), ~150ms)
  ├─ usePagination() — нарезает на 20/страницу
  └─ На expand row: enrichOne(id) → дополнительная info
  ↓
User sees: Отфильтрованный + отсортированный список, меньше 1сек latency
```

---

## Какие данные парсятся и где хранятся

### Этапы парсинга

| Этап | Запросы | Результат | Время | Где хранится |
|------|---------|-----------|-------|--------------|
| **Substring scan** | 400+ `/api/strategies?filter=X` | IDs + basic info | 30-60s | catalogCache |
| **Discover groups** | 20 `/api/discover/GROUP` | Names, Risk, Fee, Copiers | 20-30s | discoverMeta map |
| **Stats fetch** | 10k `/api/strategies/{id}` + 10k `/api/strategies/{id}/stats` | Return%, Drawdown, Trades, Markets | 120-180s | fullCache.items |
| **Retry pass** | ~500 failures × 2 attempts | Patched missing fields | 30-60s | fullCache.items |
| **Persist** | Write to disk, POST to R2 Worker | On-disk + edge | <5s | /tmp/.catalog.json + R2 |

### Структура кеша

```javascript
// Server in-memory
catalogCache = {
  items: [ { Id, Name, ImageUploaded, Profile } ] × 10k,
  building: Promise | null
};

fullCache = {
  items: [ { Id, Name, Return%, MaxDD%, NumCopiers, ..., _meta, _stats } ] × 10k,
  partial: [ same but without stats during build ],
  building: Promise | null,
  progress: { loaded, total },  // для progress bar
  at: timestamp,
  built_in_s: 180  // сколько заняло
};
```

---

## Как фильтруется

### Server-side (минимально)
- **Substring search**: `/api/strategies?filter=VALUE` (используется при парсинге)
- **IsEnabled filter**: Перед отправкой клиенту убрать `IsEnabled: false`

### Client-side (в браузере)
```typescript
passes(strategy, filters):
  ✓ Search in Name/Profile.Name
  ✓ Risk (checkbox group)
  ✓ Return% (min-max range)
  ✓ MaxDD% (range)
  ✓ NumCopiers (range)
  ✓ CopiersAUM (range)
  ✓ Fee% (max)
  ✓ Trades (min count)
  ✓ Win rate (min %)
  ✓ Account balance (range)
  ✓ Inception age (min days)
  ✓ Exclude simulated
  ✓ Exclude enriched with zero trades
  
  O(n) complexity, ~10ms для 10k items
```

---

## Нагрузка при 5k DAU

### Traffic Estimates

```
Peak concurrent:  ~350 users (5k DAU × 5min session / 24h × 4h peak window)
Req/sec baseline: ~10 (350 users × 9 requests/session ÷ 300s/session)
Peak CPU:         ~200m (vs 8000m available) = 2.5% usage
Peak RAM:         ~100 MB (vs 512 MB) = 20% usage
Bandwidth/day:    ~1.8 GB inbound (trivial for cloud)
Upstream calls:   ~50k/day (vs unknown Libertex quota)
```

### Сравнение с ограничениями

| Ограничение | Текущее | При 5k DAU | Статус |
|------------|---------|-----------|--------|
| CPU cores (8) | 200m | 350m | ✅ OK (4% usage) |
| Memory (512 MB) | 100 MB | 100 MB | ✅ OK (20%) |
| Rate limit (120 req/min) | not hit | if ~42 IP pools | ⚠️ borderline |
| Disk (1 GB) | 25 MB | 25 MB | ✅ OK |
| Bandwidth (2 Gbps) | 500 GB/mo est. | 1.8 GB/day | ✅ OK (1000x margin) |
| Upstream quota | ? | ~50k req/day | ❓ Unknown risk |

---

## Возможности улучшения (по приоритету)

### ✨ Неделя 1: Мониторинг (КРИТИЧНО)

```
1. Добавить /__metrics endpoint
   └─ Track: rebuild duration, upstream 429 rate, total rebuilds
   └─ Alert if rebuild > 10 min (sign of throttling)
   └─ Why: Узнаете первыми, если Libertex качнёт квоты

2. Поднять RATE_LIMIT: 120 → 300 req/min/IP
   └─ Даст 2.5x буфер для пиковых часов
   └─ 30 сек измен в server.js

3. Log upstream 429 events
   └─ Count per rebuild cycle
   └─ Set alert at 3+ per day
   └─ Why: Знать, когда upstream stress начнётся
```

### ⚡ Неделя 2-3: Быстрые wins (LOW RISK)

```
4. Adaptive progress poll interval
   └─ Current: fixed 2 sec
   └─ Proposed: 2 sec early → 5 sec late (когда уже есть data)
   └─ Benefit: 60% fewer polling requests
   └─ Lines: vue/src/composables/useCatalog.ts (line 105-120)

5. Client-side search dedup
   └─ Before API call: filter locally
   └─ Only if < 50 results → call API for enrichment
   └─ Benefit: 50% fewer search API requests
   └─ Lines: vue/src/composables/useCatalog.ts (line 149-174)

6. Extend rebuild interval on upstream stress
   └─ if (upstream_failures > 20%) REBUILD_INTERVAL_H++
   └─ Graceful degrade: freshness 6h → 8h vs. rebuild failures
   └─ Lines: server.js (line 450+)
```

### 🏗️ Неделя 4+: Архитектурные улучшения (MEDIUM EFFORT)

```
7. Incremental catalog updates
   └─ Instead: Full rebuild every 6h (40k+ upstream requests)
   └─ Better: Diff-based update every 30 min (~5k requests)
   └─ Benefit: Freshness 6h → 30 min, same upstream load
   └─ Effort: New endpoint, tracking last-seen state

8. Discover groups batching
   └─ Current: Sequential fetch 20 groups
   └─ Better: Fetch /api/discover once (returns all)
   └─ Benefit: -15 sec per rebuild
   └─ Risk: Low (already in code, just optimization)

9. Server-side search index
   └─ Current: O(n) filter on client
   └─ Better: Trie/prefix tree on server, /api/strategies?q=go
   └─ Benefit: Typeahead UX, lower bandwidth for search
   └─ Risk: Medium (adds server complexity)

10. GraphQL layer (future, if needed)
    └─ Current: Fetch all 10k, filter in browser
    └─ Better: /graphql { strategies(risk: High) { id name } }
    └─ Benefit: Server-side filtering, less bandwidth
    └─ Risk: High (major refactor, profile first)
```

---

## Production Readiness Checklist

### 🟢 Сейчас (готово)

- ✅ Двухуровневое кеширование (memory + disk)
- ✅ Graceful partial loading (cold start UX)
- ✅ Compression (gzip для JSON)
- ✅ Rate limiting per IP
- ✅ Health checks (/healthz, /readyz)
- ✅ Token refresh automation (refresher.js)
- ✅ Error handling + retries (exponential backoff)
- ✅ Browser cache headers

### 🟡 Нужно перед 5k DAU

- ⚠️ **CRITICAL**: Мониторинг upstream throttling events
- ⚠️ Raise RATE_LIMIT to 300 (текущие 120 могут быть узким местом)
- ⚠️ Logs + alerts for rebuild failures
- ⚠️ Grafana dashboard (CPU, RAM, rebuild time, error rates)
- ⚠️ On-call runbook для throttling response

### 🟢 Nice to have (Week 2+)

- 📊 Metrics endpoint for observability
- 📈 Adaptive poll interval (client-side optimization)
- 🔍 Server-side search index (UX improvement)
- 🌐 Incremental updates (freshness + efficiency)

---

## Что произойдёт при каждом сценарии

### Сценарий 1: Normal Day (5k DAU, smooth)

```
08:00 AM: Server starts, loads /tmp/.catalog.json from disk
          Users land, see 10k strategies instantly ✅
          
14:00 PM: Rebuild schedule triggers
          Old data still served (stale-while-revalidate)
          Background rebuild (fullCache.building)
          Users don't notice ✅
          
14:05 PM: Rebuild completes
          New data cached, next requests are fresh ✅
```

### Сценарий 2: Upstream Throttling (429 × 10+)

```
Scenario: Libertex API hit rate limits
Result:   pauseUntil global → all workers wait
          Exponential backoff kicks in
          Final result: Stale data served instead of error ✅
          
Fallback: Previous day's catalog from disk
          Users see old data (better than 503)
          
Solution: Extend next rebuild interval
          6h → 8h (less pressure on upstream) ✅
```

### Сценарий 3: Cold Start (no disk cache)

```
User lands right after pod restart
Request 1: GET /api/strategies-full?partial=1 @ 0s
Response:  [] (empty array, X-Catalog-Building: 1)
Result:    User sees "Refreshing..." + progress bar ✅

Meanwhile: Parallel rebuilds happening (3-5 min)

User's subsequent polls:
  @ 2s:  GET progress → loaded: 2000/10000 (20%) → User sees progress
  @ 4s:  GET partial=1 → 2000 items, User sees list populate ✅
  @ 6s:  GET progress → loaded: 4000/10000
  @ 120s: GET full → 10k items, done ✅
  
UX: Progressive loading, not blank screen ✅
```

### Сценарий 4: Rate Limit Hit (5k DAU, not distributed)

```
All users behind same NAT/VPN IP
Rate limit: 120 req/min/IP
User rate: 5000 users × 2 req/min ≈ 10k req/min

Result: 429 Retry-After: 60
User: Sees error or retry later ❌

Solution: 
  Option 1: Increase RATE_LIMIT → 300 req/min
  Option 2: Use per-user token instead of per-IP
  Option 3: Users use different networks (natural at scale)
```

---

## Финальный вердикт

### ✅ Можно ли обслуживать 5k DAU?

**ДА**, при условиях:

1. **CPU/Memory/Disk** — избыток (2-15x margin)
2. **Bandwidth** — избыток (1000x margin)  
3. **Rate limiting** — поднять до 300 req/min (одна строка)
4. **Upstream API** — главный риск, но управляем:
   - Мониторить 429 events
   - Extend rebuild interval на throttling
   - Incremental updates (future, если нужна freshness < 6h)

### Рекомендуемый запуск

```
Week 1: Deploy with monitoring + RATE_LIMIT=300
        Alert if rebuild > 10 min or 429 rate > 5/day
        
Week 2-3: Run with 5k DAU, monitor for 2-3 weeks
         Collect data on:
         - Actual upstream 429 frequency
         - Rebuild duration distribution
         - Peak concurrent user patterns
         
Week 4+: Based on data:
         - If smooth → no changes needed
         - If upstream 429 common → implement #4 (adaptive interval)
         - If search volume high → implement #5 (client dedup)
         - If freshness needed < 6h → plan #7 (incremental updates)
```

### Ключевые файлы для мониторинга

```
server.js:
  L 235: REBUILD_INTERVAL_H (default: 6)
  L 522: RATE_LIMIT (default: 120)
  L 350: Rebuild concurrency (12 workers)
  L 446-459: Background rebuild logic
  L 703-713: Cold start handling (returns empty array fast)
  
vue/src/composables/useCatalog.ts:
  L 82-94: Progress polling (fixed 2s, could be adaptive)
  L 149-174: Search enrichment (local filter before API)
  
Metrics to track:
  - rebuild_duration_sec
  - upstream_429_count_per_rebuild
  - catalog_size_items
  - cache_hit_rate (fullCache.items vs rebuild)
  - max_concurrent_users
  - avg_request_latency
```

---

## Ответы на типичные вопросы

**Q: Какой главный риск?**  
A: Libertex Social API throttling (429). Управляется мониторингом + adaptive rebuild interval.

**Q: Нужно ли парить или кешировать на другом слое (Redis)?**  
A: Нет, в-памяти достаточно. Redis добавит latency + complexity, выигрыш <5%.

**Q: Нужен ли GraphQL для фильтрации?**  
A: Нет, client-side фильтр в браузере на 10k items <10ms. GraphQL полезен при >100k items.

**Q: Что если Libertex API упадёт?**  
A: Сервер вернёт stale data из cache (до 6h старая, но функциональна). Не 503.

**Q: Нужна ли база данных?**  
A: Нет, эфемерный кеш на диск достаточен (JSON file, 25 MB).

**Q: Можно ли добавить real-time updates (WebSocket)?**  
A: Возможно, но каталог меняется медленно (1-2% новых стратегий в день).  
Текущий 6h rebuild + incremental updates (future) достаточен.

**Q: Нужна ли авторизация на клиенте?**  
A: Нет, это read-only публичный API. Токен только на сервере.

---

## Резюме одного абзаца

Система **готова обслуживать 5k DAU** с текущей архитектурой. Парсинг работает в две фазы (базовый каталог + параллельная загрузка stats), данные кешируются в памяти (35 MB) + на диск, фильтрация происходит в браузере (O(n) за 10ms на 10k items). Главный риск — throttling от Libertex API (40-50k req/day), управляем мониторингом + adaptive rebuild interval. Все остальные компоненты (CPU, RAM, bandwidth) имеют 6-15x запас. Рекомендуется: (1) поднять RATE_LIMIT до 300, (2) добавить мониторинг 429 events, (3) развернуть и наблюдать 2-3 недели, (4) внедрить quick wins (#4-6) по результатам.
