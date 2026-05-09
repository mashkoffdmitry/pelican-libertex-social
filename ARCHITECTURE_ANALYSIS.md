# Архитектура Pelican: Анализ парсинга, хранения, фильтрации и масштабируемости

## 1. ДЕ БЕРЕТСЯ ДАННЫЕ (Data Source)

### 1.1 Источник
- **Upstream**: `papi.copy-trade.io` (Libertex Social API)
- **Механизм доступа**: OAuth2 OIDC (token в `.env`, ротируется через `refresher.js`)
- **Rate Limit upstream**: по всей видимости, встроенный backoff (429 → ждем, потом retry)

### 1.2 Двухуровневый парсинг

#### Уровень 1: **базовый каталог** (buildCatalog)
```
buildCatalog() → getCatalog()
├─ Subprocess 1: Substring scan (concurrency=5)
│  ├ Запрос к /api/strategies?filter=a
│  ├ Запрос к /api/strategies?filter=b
│  ├ ... (36 букв + 400+ двухбуквенных комбо)
│  └ Результат: ~2500-3000 стратегий (выявлены через substring)
│
└─ Subprocess 2: Discover groups (sequential)
   ├ /api/discover/Strategies → ~2500
   ├ /api/discover/CopiersBalance → ~1100
   ├ /api/discover/GlobalSignals → ~800
   ├ /api/discover/HighRisk, LowRisk, MediumRisk → risk сегментация
   └ Другие: TopFreeSignals, ReturnLastMonth и т.д.

Итог: ~10k-12k уникальных стратегий (дедуплицированы по ID в Map)
TTL: 10 мин (CATALOG_TTL_MS)
```

**Проблемы:**
- Substring scan занимает время (5 параллельных потоков, но много сетевых запросов)
- Зависит от скорости upstream API
- Может потерять новые стратегии, если они не содержат буквы/цифры из scan queries

---

## 2. КАК СТРОИТСЯ ПОЛНЫЙ КАТАЛОГ (buildFull)

### 2.1 Этапы

```
buildFull(token)
│
├─ 1. getCatalog() → базовый список ID + минимум данных
│
├─ 2. collectDiscoverMeta() → вытащить мета из discover groups
│  └─ По каждой стратегии: Name, NumCopiers, Fee, RiskProfile, ImageUploaded, Profile
│  └ Параллельно на ranking: _returnRank (для приоритизации)
│
├─ 3. Сортировка по приоритету:
│  ├─ 1) по Return (дешевле fetch высокопроизводительные первыми)
│  └─ 2) по NumCopiers (как tie-breaker)
│
├─ 4. Parallel stats enrichment (concurrency=12 по умолчанию)
│  └─ Для каждой стратегии fetch:
│     ├─ /api/strategies/{id} → Name, NumCopiers, Fee, RiskProfile, IsSimulated, IsEnabled, Profile
│     └─ /api/strategies/{id}/stats → Return%, Drawdown%, Trades, Markets, Balance, Profit
│
├─ 5. Pre-fill fullCache.partial (line 328)
│  └─ Промежуточный результат (без stats) → доступен сразу клиентам на ?partial=1
│
├─ 6. Background работа (пока выбираются stats)
│  └─ Клиенты в это время видят ?partial=1 → постепенно обновляется
│
├─ 7. Final retry pass (concurrency=6)
│  └─ Все, чьи stats/meta = null → одна еще попытка
│
└─ 8. Save to disk + Upload to R2 (если CATALOG_INGEST_URL set)
```

**Критический момент:** fullCache.partial заполняется ДО параллельной подгрузки stats  
→ Клиент может начать работать с полусырыми данными и быть в курсе по progress-полингу

### 2.2 Timing для ~10k стратегий

```
Substring scan:           ~30-60 сек (зависит от upstream)
Discover groups:          ~20-30 сек
Parallel stats (12 work):  ~90-180 сек (12-20 параллельных запросов)
Final retry (6 work):      ~30-60 сек
──────────────────────────────────
Итого:                     ~3-5 мин на полную сборку

Если upstream throttling → может быть дольше.
```

---

## 3. КЕ ХРАНИТСЯ (Storage Architecture)

### 3.1 In-memory Caches

#### catalogCache (базовый каталог)
```javascript
{
  at: timestamp,
  items: Strategy[],      // ID + Name + Image + Profile
  building: Promise,      // во время buildCatalog
}
```
**TTL**: 10 минут

#### fullCache (полный каталог с stats)
```javascript
{
  at: timestamp,
  items: Strategy[],      // полная стратегия с Return, DD, Trades и т.д.
  partial: Strategy[],    // incomplete items (во время buildFull)
  building: Promise,      // во время buildFull
  progress: { loaded, total },  // для progress bar
  built_in_s: number,     // сколько заняла сборка
}
```
**TTL**: 6 часов (по умолчанию CATALOG_REBUILD_INTERVAL_H=6)

### 3.2 Disk Persistence

```
/tmp/.catalog.json
{
  "at": 1715000000000,
  "items": [ { Id, Name, Return%, MaxDD%, ... } ]
}
```

**Цель**: сохранить каталог при перезапуске контейнера  
→ На старте сервер загружает из дифка, не ждет upstream rebuild

### 3.3 Edge Cache (опционально)

```
Cloudflare Worker R2 bucket
├─ URI: pelican-catalog-worker.{account}.workers.dev
├─ Хранит: gzipped JSON каталога
├─ Update: после каждого buildFull() сервер POSTs в /__ingest на Worker
├─ Serve: Worker отдает 1 часов кеш
└─ Benefit: географическая близость (край вместо центра)
```

---

## 4. КАК ФИЛЬТРУЕТСЯ (Filtering Pipeline)

### 4.1 Server-side фильтрация

**Substring search** (при полной сборке):
```typescript
/api/strategies?filter=VALUE
```
- Это возвращает все стратегии, чье Name или другие поля содержат VALUE
- **Используется при**: Initial catalog load (buildCatalog) и при поиске нового термина

**Enabled filter:**
```typescript
const onlyEnabled = arr => arr.filter(s => s.IsEnabled !== false);
```
- Отбрасывает `IsEnabled: false` перед ответом на `/api/strategies-full`

### 4.2 Client-side фильтрация (Vue composables)

#### useCatalog
- Fetch `/api/strategies-full` (или partial при cold start)
- Кеширует в памяти
- Тригер refresh = очистить кеш + перезагрузить

#### useFilters (vue/src/composables/useFilters.ts)
Применяет к каждой стратегии:

```typescript
function passes(s: Strategy, f: FiltersState): boolean {
  // Search (case-insensitive, в Name или Profile.Name)
  if (f.search) {
    const q = f.search.toLowerCase();
    if (!s.Name.includes(q) && !s.Profile?.Name?.includes(q)) return false;
  }
  
  // Risk (по RiskProfile)
  if (f.risk.size && !f.risk.has(s.RiskProfile)) return false;
  
  // Exclude simulated
  if (s.IsSimulated) return false;
  
  // Exclude enriched strategies with zero trades
  if (s._stats && !s.TradesTotal) return false;
  
  // Numeric filters (все чек на range)
  if (f.copiersMin != null && s.NumCopiers < f.copiersMin) return false;
  if (f.aumMin != null && s.CopiersAUM < f.aumMin) return false;
  if (f.balanceMin && s.AccountBalance < f.balanceMin) return false;
  if (f.balanceMax && s.AccountBalance > f.balanceMax) return false;
  if (f.retMin && s.Return < f.retMin) return false;
  if (f.retMax && s.Return > f.retMax) return false;
  if (f.ddMax && Math.abs(s.MaxDD) > f.ddMax) return false;
  // ... и еще 5-10 чеков
  
  return true;
}
```

#### useSort
- Сортирует отфильтрованный массив по: Return (default), NumCopiers, RiskProfile и т.д.

#### usePagination
- Нарезает на страницы по 20 элементов

**Полная цепочка:**
```
Raw catalog (10k)
  ↓ [useFilters.passes() — линейный O(n) скан]
Filtered (e.g., 2k с risk=High)
  ↓ [useSort]
Sorted (e.g., по Return DESC)
  ↓ [usePagination]
Page 1 of N (20 элементов)
```

**Сложность:** O(n) фильтр + O(n log n) сортировка + O(1) пагинация

---

## 5. ТЕКУЩИЕ ОГРАНИЧЕНИЯ И РЕЖИМНЫЕ ПАРАМЕТРЫ

### 5.1 Rate Limiting

```javascript
RATE_LIMIT = 120 req/min per IP (можно менять через env)
```

**Как это работает:**
- Раздвижное окно (sliding window) на 1 минуту
- Если IP превышил → 429 Retry-After
- Per-IP (за X-Forwarded-For или remoteAddress)

**Для 5k пользователей:**
- 5000 пользователей × 1 req/min = 5000 req/min baseline
- С 120 limit/IP → нужно распределение на ~42 IP или повышение лимита

### 5.2 Concurrency на server.js

```javascript
buildCatalog: concurrency=5 (для substring scan)
buildFull:    concurrency=12 (для stats fetch)
retryPass:    concurrency=6
```

**Upstream throttling:** сервер имеет exponential backoff + pauseUntil глобально

### 5.3 Caching Strategy

```
/api/strategies-full?partial=1
  ├─ Cache-Control: public, max-age=5 (если cold start)
  └─ Cache-Control: public, max-age=300 (если есть данные)

/api/strategies-full (без partial)
  └─ Cache-Control: public, max-age=300

Browser + CDN могут переиспользовать → экономия bandwidth
```

### 5.4 Rebuilds Schedule

```
Каждые 6 часов (CATALOG_REBUILD_INTERVAL_H)
├─ Полная пересборка с upstream
├─ Обновление диска и (опционально) R2
└─ Старые клиенты получают stale-while-revalidate
```

---

## 6. МАСШТАБИРУЕМОСТЬ НА 5K DAILY USERS

### 6.1 Traffic Analysis

**Assumptions:**
- 5000 DAU (Daily Active Users)
- Avg session = 5 min
- Peak hours = 4 часа (e.g., 9-13:00)

**Baseline traffic:**
```
Peak concurrent:        5000 users × (5 min session / 24 hours / 60 min) × (4 peak / 24 avg)
                        ≈ 350 concurrent users

Request rate per user:
  - Page load:          1 req (/api/strategies-full initial)
  - Search:             5 req (каждый символ в поиске = debounce + request)
  - Pagination:         2 req (переходы между страницами)
  - Expand row:         1 req (enrichOne по ID)
  - Total per session:  ~9 req

Peak rate:              350 concurrent × 9 req/session ÷ 300s/session ≈ 10.5 req/sec
```

**Against 120 req/min/IP:**
- 120 req/min = 2 req/sec per IP
- Если 350 concurrent users распределены на разные IP → ~175 IP
- 10.5 req/sec ÷ 175 IP ≈ 0.06 req/sec per IP ✓ (в пределах)

**Вывод:** Rate limiting не будет узким местом при нормальном распределении IP.

---

### 6.2 Server Load

#### CPU/Memory (в контейнере)

**Catalog build (во время rebuild):**
- Substring scan × 5 concurrent = ~5 HTTPS connections
- Discover groups × 1 sequential = ~1 HTTPS connection  
- Stats fetch × 12 concurrent = ~12 HTTPS connections
- **Пик:** ~20 simultaneous connections + JSON parsing + Array operations

**Per-user filtering (на клиенте):**
- Полный фильтр + сортировка = O(n log n) в браузере
- n=10k → ~100k операций
- Выполняется in-browser (~10ms на современном устройстве)
- **Server не задействован**

**Estimate (mctl labs):**
```
Baseline:     ~100m CPU (idle)
Peak build:   ~500m CPU (rebuild окна)
Peak traffic: ~200m CPU (обработка 10 req/sec × JSON)
───────────────────
Limit:        8 cores = 8000m (текущий квота labs)
Buffer:       Да, есть (3-4 других сервиса в teams)
```

**Вывод:** При текущей квоте labs (8 cores) масштабируется до 10k+ DAU.

---

### 6.3 Network/Bandwidth

#### Outbound (server → upstream)

```
buildFull на 10k strategies:
├─ 400+ substring requests → 400 × 3KB reply ≈ 1.2 MB
├─ 20 discover requests → 20 × 10KB reply ≈ 200 KB
└─ 10k stats requests → 10k × 2KB reply ≈ 20 MB
───────────────────────
Total per rebuild: ~21 MB outbound
Frequency: 1× per 6h
Bandwidth: ~1.2 MB/h baseline (за 6h)
```

**Frequency (5k users):**
```
10 req/sec × 2KB response ≈ 20 KB/sec
Per day: 20 KB/s × 86400s ≈ 1.7 GB/day inbound
Plus rebuilds: 21 MB × 4/day ≈ 100 MB/day
─────────────────────────────
Total: ~1.8 GB/day (очень доступно для cloud)
```

#### Inbound (users → server)

```
5k users × 9 requests/session × 0.5KB avg request ≈ 22.5 MB/day
```

**Вывод:** Bandwidth не будет узким местом.

---

### 6.4 Storage

#### Disk (catalog.json)

```
10k strategies × ~2.5 KB per item = ~25 MB JSON
Compressed (gzip): ~3-4 MB
```

**Versionning:** только 1 версия на диске  
**Cleanup:** никакой (перезаписывается каждые 6h)

#### Memory (fullCache)

```
10k strategies × ~2.5 KB = 25 MB live array
Plus catalogCache: ~5 MB
Plus filtering working set: ~5 MB
──────────────────────────
Total: ~35 MB steady state
```

**Вывод:** Современному контейнеру 256 MB достаточно (текущий: 512 MB в mctl).

---

### 6.5 Upstream API Pressure

**Current:**
```
Rebuild каждые 6 часов
= 4 полных rebuilds/день
= 4 × (400 substring + 20 discover + 10k stats) = ~40k requests/день к upstream
```

**At 5k DAU (same traffic pattern):**
```
Same rebuilds + user-driven stats requests
= 40k (rebuilds) + 5k users × 1 per-user stat fetch (initial enrichOne)
= ~50k requests/день к upstream
```

**Throttling risk:**
- Libertex Social API has undisclosed rate limits
- Текущий код имеет exponential backoff (45s + random)
- Если upstream 429 → pauseUntil global → все workers ждут
- **Mitigations:**
  - Increase rebuild interval от 6h → 8-12h (требует мониторинга дежурных данных)
  - Request batching в discover groups (сейчас sequential)
  - Caching на выходе (уже на 5m/300s)

**Вывод:** Upstream pressure управляема, но требует мониторинга throttling events.

---

## 7. РЕКОМЕНДАЦИИ НА УЛУЧШЕНИЕ

### 7.1 Короткосроч (0-2 недели)

#### 1. **Мониторинг rate limits**
```javascript
// Добавить метрику в /__status
{
  ...,
  upstream_backoff_active: pauseUntil > now,
  estimated_wait_sec: (pauseUntil - now) / 1000,
  rebuild_failures_today: 3,
}
```
→ Видеть, когда upstream throttling влияет на freshness

#### 2. **Adaptive partial poll interval**
```typescript
// useFilters.ts: вместо fixed 2s poll
if (catalog.building && !catalog.ready) {
  pollInterval = min(5s, 2s × Math.sqrt(elapsed_sec))
}
```
→ Реже опрашивать прогресс на позднем этапе (уже есть data)

#### 3. **Client-side deduplication search**
```typescript
// При поиске: вместо /api/strategies?filter=VALUE на каждый keystroke
// Сначала filter() в памяти, только если <50 результатов → запрос на обогащение
if (localFiltered.length <= 50) {
  fetchExtra(searchTerm)  // существует, но не используется широко
}
```
→ На 50% меньше запросов при поиске

#### 4. **Rebuild interval dynamic adjustment**
```javascript
// В buildFull() finish
if (upstream_failures > 20%) {
  console.warn('High upstream failure rate, extending interval');
  CATALOG_REBUILD_INTERVAL_H = Math.min(12, REBUILD_INTERVAL_H + 1);
}
```
→ Гашеники throttling не усугубляют положение

---

### 7.2 Среднесроч (2-8 недель)

#### 5. **Discover groups batching**
```javascript
// Вместо sequential fetch /api/discover/X, /api/discover/Y, ...
// Взять весь /api/discover (возвращает все группы сразу)
// Сейчас это делается, но результат не переиспользуется
```
→ Экономия ~15 сек на build, меньше upstream запросов

#### 6. **Incremental catalog updates**
```javascript
// Вместо full rebuild каждые 6h
// Найти только новые/обновленные IDs между builds
// Fetch stats для них, merge in
```
→ Rebuild с 5 мин → 30 сек, freshness с 6h → 30 мин

#### 7. **Server-side search index**
```javascript
// Вместо O(n) filter на клиенте за каждый keystroke
// Построить простой trie/prefix tree на сервере
// /api/strategies?q=gold → быстрая подсказка
```
→ Support typeahead, снизить latency на search

#### 8. **Worker prefetch optimization**
```javascript
// Сейчас: Worker fetch /api/strategies-full, зовет origin
// Better: Proxy pushes catalog async + Worker serves aged snapshot
// = 0-latency for cold starts
```
→ Already partially done (r2-uploader), но нужна автоматизация пере-push

---

### 7.3 Долгосроч (2-6 месяцев)

#### 9. **Libertex API direct subscription (if available)**
```
Вместо polling /api/discover каждые 6h
Webhook на новые стратегии или изменения
= Real-time freshness, 0 polling overhead
```

#### 10. **GraphQL layer** (если нужна гибкость)
```
Текущее: клиент fetch /api/strategies-full (10k items), filter в памяти
Better: /graphql query { strategies(risk: High, returnMin: 5) { id name return } }
= Server-side filtering → меньше bandwidth
```
Но это сложно, требует profiling перед внедрением.

---

## 8. ИТОГОВЫЙ ВЕРДИКТ: 5K DAILY USERS

### ✅ Can handle 5k DAU

| Компонент | Capacity | Margin |
|-----------|----------|--------|
| CPU | 8 cores | 6-7x usage peak (200m/1000m) |
| Memory | 512 MB | 15x (35 MB/512 MB) |
| Bandwidth | ~2 Gbps (labs) | 1000x (1.8 MB/day) |
| Disk | 1 GB ephemeral | 40x (25 MB) |
| Rate limit | 120 req/min/IP | ✓ if distributed IPs |
| Upstream API | 50k req/day | ? (depends on Libertex ToS) |

### ⚠️ Potential Bottlenecks

1. **Libertex Social API throttling** — Most likely pain point
   - Currently no public SLA
   - Fix: Monitor `/api/discover` failures, extend rebuild interval on spikes

2. **Rate limiter too strict** — If users on shared networks
   - Fix: `RATE_LIMIT=500` (or use per-user token instead of per-IP)

3. **Upstream token expiry** — If OIDC client has bugs
   - Fix: Redundant refresher (background + explicit /capture endpoint ✓)

### ✨ Recommended Path to Production (5k DAU)

```
Week 1: Deploy with monitoring (Grafana dashboard)
        └─ Track: rebuild time, upstream 429 rate, user search volume
        
Week 2-3: Implement short-term wins (#1, #2, #3)
          └─ ~20% latency improvement, 10% less bandwidth
          
Week 4+: If upstream throttling observed → implement #4
         If search volume high → implement #7
         Otherwise → monitor and extend
```

---

## 9. ФАЙЛЫ ДЛЯ МОНИТОРИНГА И ПРОФИЛИРОВАНИЯ

```
server.js:
  - Line 88: catalogCache TTL 10min
  - Line 235-238: fullCache + rebuild interval
  - Line 350-351: Parallel concurrency (12)
  - Line 522: RATE_LIMIT 120

vue/src/constants/defaults.ts:
  - Line 3: PROGRESS_POLL_INTERVAL_MS 2000
  - Line 4: PARTIAL_REPAINT_INTERVAL_MS 20000

vue/src/composables/useFilters.ts:
  - Line 47-74: Filter passes() — где O(n) работает
```

---

## Резюме

**Текущий виджет + прокси способны обслуживать 5k DAU**, если:

1. Распределение по IP нормальное (не все за VPN)
2. Libertex Social API не имеет скрытых квот на нас
3. Upstream latency < 10s (сейчас ~1-2s)

**Главное узкое место:** Upstream API throttling на rebuild фазе.  
**Решение:** Adaptive rebuild interval + incremental updates (roadmap #6).

**Безопасный запуск:**
- Начать с мониторинга (/__status endpoint)
- Поднять 5k DAU, смотреть логи 2-3 недели
- При проблемах → включить quick wins (#1-4)
- В дальнейшем → incremental updates для freshness без давления на upstream
