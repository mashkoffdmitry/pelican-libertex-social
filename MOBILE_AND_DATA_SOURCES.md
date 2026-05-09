# Источники данных и оптимизация для мобильных устройств

## 1. ОТКУДА БЕРУТСЯ ДАННЫЕ В VUE WIDGET?

### 1.1 Архитектура источников данных

```
┌─────────────────────────────────────────────────────────┐
│                   Vue Component                         │
│           (PelicanLibertexSocial.vue)                   │
└────────────────┬────────────────────────────────────────┘
                 │
     ┌───────────┴────────────┐
     │                        │
     ▼                        ▼
[Вариант 1]          [Вариант 2]
Proxy только         Hybrid (рекомендуется)
     │                        │
/api/strategies-full  ┌───────┴────────┐
  ↓                   │                │
server.js            ▼                ▼
(в памяти)      apiBase          catalogBase
             (proxy server)      (R2 Worker)
    ├─ live                 ├─ Static catalog
    │ per-strategy          │ /api/strategies-full
    │ data                  │ (once per 6h)
    │                       │
    ├─ /api/strategies/{id} └─ Cloudflare edge
    └─ /api/strategies/{id}/stats  (geographic)
                           │
                    Cache: 1 hour
                           │
                    Served from R2
```

### 1.2 Два сценария инициализации

#### **Сценарий 1: Все через один proxy (простой, по умолчанию)**

```typescript
// Vue component инициализируется
<PelicanLibertexSocial 
  api-base="https://labs-pelican-proxy.mctl.ai"
  // catalogBase not set → uses apiBase
/>

// Что происходит:
1. useCatalog() → fetch('/api/strategies-full')
   ├─ GET https://labs-pelican-proxy.mctl.ai/api/strategies-full
   ├─ Server.js: getFull() → возвращает fullCache.items (35 MB raw)
   ├─ gzip compression: 35 MB → 3-4 MB on wire
   ├─ Browser cache: max-age=300 (5 min)
   └─ Total time: 2-5 sec на 4G (зависит от latency)

2. На expand row → enrichOne(id)
   ├─ GET /api/strategies/{id}
   ├─ GET /api/strategies/{id}/stats
   └─ Параллельно, 2 запроса
```

#### **Сценарий 2: Гибридный (с R2 Worker - ЛУЧШЕ для мобильных)**

```typescript
<PelicanLibertexSocial 
  api-base="https://labs-pelican-proxy.mctl.ai"
  catalog-base="https://pelican-catalog-worker.{account}.workers.dev"
/>

// Что происходит:
1. useCatalog() → fetch('/api/strategies-full', {origin: catalogBase})
   ├─ GET https://pelican-catalog-worker.xxx.workers.dev/api/strategies-full
   ├─ Worker: возвращает из R2 bucket (pre-built, static)
   ├─ gzip: 3-4 MB
   ├─ Served from Cloudflare edge (ближе геогр.)
   ├─ Cache: max-age=3600 (1 час на edge)
   └─ Total time: 1-2 sec (shorter path, edge location)

2. На expand row → enrichOne(id)
   ├─ GET /api/strategies/{id} (через apiBase proxy)
   ├─ GET /api/strategies/{id}/stats (через apiBase proxy)
   └─ Live data через основной proxy
```

**Почему гибридный лучше:**
- ✅ Статический каталог на Cloudflare edge (no compute, faster)
- ✅ Live data через proxy (freshest per-strategy info)
- ✅ Geographic optimization (nearest edge location)
- ✅ Lower latency для мобильных пользователей

---

## 2. ПОЛНЫЙ ПУТЬ ДАННЫХ ДЛЯ МОБИЛЬНОГО ПОЛЬЗОВАТЕЛЯ

### 2.1 Timeline холодного запуска (первый раз открыл приложение)

```
USER OPENS APP (на мобильном 4G)
│
├─ 0ms: Браузер загружает HTML
│       ├─ https://labs-pelican-proxy.mctl.ai/
│       ├─ Скачивает index.html (~2 KB)
│       ├─ Инлайн Vue 3 (~35 KB gzipped)
│       ├─ Инлайн PelicanLibertexSocial (~50 KB gzipped)
│       └─ Total JS: 85 KB
│
├─ 500-1000ms: Браузер парсит JS, монтирует Vue компонент
│              onMounted → catalog.start()
│
├─ 1000ms: useCatalog() делает первый запрос
│          GET /api/strategies-full?partial=1
│          ├─ Отправляется: 0.2 KB (header только)
│          ├─ Сервер проверяет холодный старт
│          ├─ Если fullCache.partial пуст И building=true
│          │  └─ Response: [] (пустой массив, 0.1 KB gzipped)
│          └─ Latency: 100-300ms на 4G (до сервера)
│
├─ 1100ms: Vue монтирует ProgressBar
│          ├─ Показывает: "Refreshing strategy data · 0%"
│          └─ User видит что-то (не blank)
│
├─ 1200ms: Клиент запускает progress polling
│          GET /api/strategies-full/progress каждые 2 сек
│          ├─ Response: { ready: false, building: true, loaded: 500, total: 10000 }
│          └─ Latency: 100-200ms на 4G
│
├─ 3200ms (через 2 сек): Второй progress poll
│          ├─ loaded: 1000/10000 (10%)
│          └─ Вероятно, fullCache.partial заполнится через 30-60 сек
│
├─ 5200ms (через 4 сек): Третий progress poll
│          ├─ loaded: 2000/10000 (20%)
│          ├─ Попытка fetch /api/strategies-full?partial=1 снова
│          ├─ Теперь partial не пуст → Response: 2000 items (2 MB gzipped)
│          ├─ На 4G: 2-5 сек скачиваем
│          └─ User видит список! (partial data) ✅
│
├─ 7000ms: После скачива 2000 items
│          ├─ useFilters() → фильтрует локально (O(n), ~10ms)
│          ├─ useSort() → сортирует (O(n log n), ~150ms)
│          ├─ usePagination() → нарезает на 20/page
│          ├─ StrategyTable → рендерит 20 rows
│          └─ User видит первую страницу с реальными данными ✅
│
├─ 7200ms: Progress polling продолжается
│          ├─ loaded: 3000/10000
│          ├─ fullCache.partial обновляется (stats подгружаются)
│          └─ Vue реактивно обновляет список (может быть заметно)
│
└─ 10000-15000ms (после 10-15 сек): Rebuild завершен
                  ├─ GET /api/strategies-full (без ?partial=1)
                  ├─ Response: 10000 items (35 MB → 3-4 MB gzipped)
                  ├─ На 4G: 5-10 сек скачиваем
                  ├─ useFilters/Sort пересчитываются (500ms)
                  └─ User видит полный список ✅

ИТОГО НА ХОЛОДНЫЙ СТАРТ:
├─ JS load + parse:     1000ms
├─ First response:       100ms (empty)
├─ Partial data wait:    ~3000-5000ms (depends on rebuild progress)
├─ Partial rendering:    150ms (filter + sort)
├─ Full data wait:       5000-10000ms
├─ Full rendering:       500ms
└─ Total UX: ~7-15 сек до полного списка

НО: User видит что-то уже через 1-1.5 сек (progress bar)
    User видит partial list через 5-7 сек
```

### 2.2 Cache hit (повторное открытие вкладки)

```
USER CLICKS BACK / REOPENS TAB (браузер cache свеженький)
│
├─ 500ms: HTML + JS (уже в памяти)
├─ 600ms: Vue монтируется
├─ 700ms: useCatalog() делает fetch
│         ├─ Browser видит Cache-Control: max-age=300 (5 min)
│         ├─ Если < 5 min → 304 Not Modified
│         ├─ Возвращает из памяти браузера
│         └─ Latency: 0-10ms (no network!)
│
├─ 800ms: useFilters() локально
├─ 950ms: Список рендерится
└─ ИТОГО: ~1 сек вместо 10-15 сек ✅
```

---

## 3. ПЕРЕМЕННЫЕ МОБИЛЬНОЙ СЕТИ

### 3.1 Сетевые профили

```
┌──────────────┬──────────┬──────────┬──────────┬──────────┐
│ Сеть         │ Latency  │ DL Speed │ 35 MB    │ 3-4 MB gz│
├──────────────┼──────────┼──────────┼──────────┼──────────┤
│ 5G ideal     │ 20ms     │ 100 Mbps │ 3 сек    │ 0.25 сек │
│ 4G LTE good  │ 50ms     │ 20 Mbps  │ 14 сек   │ 1.5 сек  │
│ 4G LTE bad   │ 200ms    │ 5 Mbps   │ 56 сек   │ 6 сек    │
│ 3G           │ 400ms    │ 1 Mbps   │ 280 сек! │ 30 сек   │
│ EDGE/2G      │ 500ms    │ 0.1 Mbps │ 2800 сек │ 280 сек! │
└──────────────┴──────────┴──────────┴──────────┴──────────┘

Текущий payload:
├─ JS bundle: 85 KB
├─ Catalog (full): 35 MB raw → 3-4 MB gzipped
├─ Per-strategy stats: 2-10 KB каждый (на demand)
└─ TOTAL initial: ~4 MB gzipped

На 4G LTE хорошей сети:
├─ JS: 85 KB ÷ 20 Mbps ≈ 35 ms
├─ Каталог: 4 MB ÷ 20 Mbps ≈ 1.6 сек
└─ ИТОГО сетевой: ~2 сек + latency

На 4G LTE плохой сети:
├─ Каталог: 4 MB ÷ 5 Mbps ≈ 6.4 сек
└─ ИТОГО сетевой: ~6 сек + latency

На 3G:
├─ Каталог: 4 MB ÷ 1 Mbps ≈ 32 сек
└─ ИТОГО сетевой: ~32 сек (UNACCEPTABLE) ❌
```

### 3.2 Device performance

```
┌──────────────────┬─────────┬─────────┬──────────┐
│ Device           │ RAM     │ CPU     │ JSON 10k │
├──────────────────┼─────────┼─────────┼──────────┤
│ iPhone 15        │ 6 GB    │ A17 Pro │ 5ms      │
│ iPhone 12        │ 4 GB    │ A14     │ 15ms     │
│ Samsung Galaxy   │ 4-8 GB  │ SD8 Gen │ 10ms     │
│ Budget Android   │ 2-3 GB  │ budget  │ 50-100ms │
│ Old device (5y+) │ 1-2 GB  │ weak    │ 200ms    │
└──────────────────┴─────────┴─────────┴──────────┘

Parsing 10k items JSON:
├─ Fast device: 5-15 ms
├─ Average device: 20-50 ms
├─ Slow device: 100-200 ms
└─ Very old device: 300+ ms (noticeable, but ok)

Vue filtering on 10k items:
├─ Fast device: 10 ms
├─ Average device: 20-30 ms
├─ Slow device: 50-100 ms
└─ Very old device: 200+ ms (может быть laggy)
```

---

## 4. КАК РАБОТАЕТ НА МОБИЛЬНЫХ (ОПТИМИЗАЦИЯ)

### 4.1 Текущие преимущества

✅ **Gzip compression**
```
35 MB raw → 3-4 MB gzipped (8-10x compression)
Сэкономлено: ~30 MB на каждый загрузке
На 4G 5 Mbps: экономия 48 сек vs uncompressed
```

✅ **Partial loading**
```
User видит прогресс через 5-7 сек (partial data)
Вместо 15-20 сек ожидания полного каталога
Better perceived performance
```

✅ **Client-side filtering**
```
10k items фильтруются в браузере (~10ms)
Не требует дополнительных сетевых запросов
Реактивно обновляется при изменении слайдера
```

✅ **Browser cache**
```
Cache-Control: max-age=300
Повторное открытие: 0 сетевого трафика
Если < 5 min: 304 Not Modified (заголовки только)
```

✅ **R2 edge deployment (если включен)**
```
Каталог на Cloudflare edge (ближе)
Shorter path → lower latency
Especially для мобильных (часто далеко от центра)
```

### 4.2 Что еще можно оптимизировать

#### 1. **Payload size reduction** (CRITICAL для медленных сетей)

**Текущий подход:**
```json
{
  "Id": 123,
  "Name": "Strategy Name",
  "Return": 45.2,
  "MaxDD": -12.3,
  "NumCopiers": 5432,
  "Fee": 0.02,
  "RiskProfile": "High",
  "Currency": "USD",
  "TradesTotal": 156,
  "Wins": 98,
  "Markets": [{ "n": "EURUSD", "c": 45 }],
  // ... 15 более полей
}
```
**Размер:** ~2.5 KB per item × 10000 = 25 MB → 3-4 MB gzipped

**Оптимизация 1: Field aliasing (SHORT KEYS)**
```javascript
// Instead of "NumCopiers": 5432
// Use:        "nc": 5432
// Instead of "RiskProfile": "High"
// Use:        "rp": 1  // 0=Low, 1=Med, 2=High

Full mapping:
{
  "i": id,         // Id
  "n": name,       // Name
  "r": return,     // Return
  "d": maxDD,      // MaxDD
  "c": numCopiers, // NumCopiers
  "f": fee,        // Fee
  "rp": riskProfile, // RiskProfile (0/1/2)
  "cu": currency,  // Currency
  "tt": tradesTotal,
  "w": wins,
  "m": markets,    // compressed too
}
```
**Результат:** -40% размер JSON (25 MB → 15 MB → 2 MB gzipped)
**На 4G 5 Mbps:** -3.2 сек загрузки

#### 2. **Progressive delivery (PARTIAL PAYLOAD)**

**Текущий подход:**
```
GET /api/strategies-full → 10k items (all fields)
Размер: 3-4 MB gzipped
Время: 1-6 сек на мобильном
```

**Оптимизация: Две версии payload**
```
GET /api/strategies-full?fields=essential
├─ Return только: Id, Name, Return%, Risk, NumCopiers
├─ Размер: 0.5 MB gzipped
├─ Загрузка: 0.25-1 сек на 4G 5 Mbps ✅
└─ User видит список через 1-2 сек

Затем (async, фоновый запрос):
GET /api/strategies-full?fields=full
├─ Полные данные за исключением stats (Markets, Trades, Balance)
├─ Размер: 2 MB gzipped
├─ Инкрементально обновляет данные
└─ На медленной сети: не блокирует UI
```

**На 3G (неприемлемо сейчас):**
```
Current (full): 35 MB ÷ 1 Mbps = 280 сек ❌
Essential: 0.5 MB ÷ 1 Mbps = 4 сек ✅
Full: 2 MB ÷ 1 Mbps = 16 сек (async) ✅
ИТОГО UX: 4 сек до списка, полные данные за 16 сек
```

#### 3. **Brotli compression** (vs gzip)

```
JSON compression ratio:
├─ Uncompressed: 25 MB
├─ Gzip (current): 3-4 MB
├─ Brotli (proposed): 2-2.5 MB (-20% vs gzip)
│
└─ На медленной сети: -0.5 сек (небольшой выигрыш)
```

**Но требует:**
- Поддержка в браузере (98% devices сейчас)
- Изменение в server.js (используется zlib.gzipSync)

#### 4. **Network Information API** (Adaptive loading)

```typescript
// В Vue component
const connection = navigator.connection;
const effectiveType = connection?.effectiveType; // '4g', '3g', etc

if (effectiveType === '3g' || effectiveType === '2g') {
  // Fetch только essential fields
  fetchStratories({ fields: 'essential' });
  // Show "Loading..." or skip stats
} else if (effectiveType === '4g') {
  // Fetch full payload
  fetchStratories();  // default
} else {
  // effectiveType === '5g' или unknown
  fetchStratories();  // go with full
}
```

**Benefit:** User на 3G видит UI в 4 сек вместо 280 сек ❌→✅

#### 5. **Service Worker caching** (для offline support)

```javascript
// In service worker
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/strategies-full')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
  }
});

// Benefit:
// ├─ Offline mode: старый каталог из cache
// ├─ Low bandwidth: skip network if cache < 1 hour
// └─ Users on slow networks: fallback to cache
```

---

## 5. РЕКОМЕНДАЦИИ ДЛЯ МОБИЛЬНОЙ ОПТИМИЗАЦИИ

### Если целевая аудитория: Развитые страны (4G+ dominant)

```
✅ READY TO SHIP сейчас
├─ Gzip compression работает
├─ Partial loading UI готов
├─ Browser cache настроен
├─ R2 edge optional (nice to have)
│
└─ Только рекомендуется:
   - Включить R2 (catalogBase параметр)
   - Поднять RATE_LIMIT (если 5k DAU)
   - Добавить progress bar улучшения (adaptive poll)
```

### Если целевая аудитория: Emerging markets (3G/poor 4G)

```
⚠️ НУЖНЫ ИЗМЕНЕНИЯ:
├─ Priority 1: Essential-only payload
│  └─ /api/strategies-full?fields=essential (0.5 MB)
│  └─ Effort: 2-4 часа
│  └─ Impact: 3G users: 280s → 4s ✅
│
├─ Priority 2: Network Information API
│  └─ Detect 3G, fetch essential by default
│  └─ Effort: 1-2 часа
│  └─ Impact: Auto-optimize for slow networks
│
├─ Priority 3: Field aliasing (short keys)
│  └─ JSON size: 25 MB → 15 MB
│  └─ Effort: 3-5 часов
│  └─ Impact: -40% bandwidth on all devices
│
└─ Priority 4: Service Worker offline mode
   └─ Effort: 4-6 часов
   └─ Impact: App works offline, fallback to cache
```

---

## 6. ТЕКУЩЕЕ СОСТОЯНИЕ И ROADMAP

### 🟢 Работает отлично (4G+)

```
Сеть           Холодный старт    Повторный запрос
─────────────────────────────────────────────────
5G             3-5 сек ✅        < 1 сек ✅
4G LTE (хорошо) 5-7 сек ✅        < 1 сек ✅
4G LTE (плохо)  15-20 сек ✅      < 1 сек ✅
```

### 🟡 Неприемлемо (3G и ниже)

```
Сеть           Холодный старт    Статус
─────────────────────────────────────────
3G             ~30-45 сек ⚠️     Нужны изменения
2G/EDGE        280+ сек ❌       Не поддерживать
```

### 📋 Что делать

```
SHORT TERM (2 недели):
├─ Включить R2 (catalogBase параметр)
│  └─ Reduce latency via Cloudflare edge
│  └─ Already built, just need wiring
│
└─ Документировать для пользователей:
   "Требует 4G+ для удобства. На 3G возможны задержки."

MEDIUM TERM (1-2 месяца):
├─ Implement essential-only payload
│  └─ /api/strategies-full?fields=essential
│  └─ Support 3G properly
│
└─ Add Network Information API detection
   └─ Auto-adapt based on connection type

LONG TERM (если нужно 3G support):
├─ Field aliasing (short keys)
├─ Service Worker + offline mode
└─ Consider native app for offline access
```

---

## 7. КОНКРЕТНЫЕ ЦИФРЫ СЕЙЧАС

### Холодный старт (первый раз открыл приложение)

**На 4G LTE (хорошо, 20 Mbps)**
```
1. HTML load:         100 ms
2. JS parse:          900 ms
3. Vue mount:         1000 ms
4. First API call:    100 ms (empty response)
5. Progress poll:     2-5 сек (ждем partial data)
6. Fetch partial:     500 ms
7. Render partial:    150 ms
   USER SEES LIST → ✅ 5-7 сек

8. Background: full rebuild 3-5 min
9. Fetch full:        1.5 сек (3-4 MB gzipped)
10. Render full:      500 ms
    FULL LIST READY → ✅ 10-15 сек
```

**На 4G LTE (плохо, 5 Mbps)**
```
1-4. Same as above    2 сек
5. Progress poll:     2-5 сек (depends on rebuild)
6. Fetch partial:     2 сек (2 MB ÷ 5 Mbps)
7. Render:            150 ms
   USER SEES LIST → ✅ 6-8 сек

8-9. Fetch full:      6 сек (3-4 MB ÷ 5 Mbps)
10. Render:           500 ms
    FULL LIST READY → ✅ 12-15 сек
```

**На 3G (1 Mbps)**
```
1-4. Same            2 сек
5. Progress poll:    2-5 сек
6. Fetch partial:    16 сек (2 MB ÷ 1 Mbps)
7. Render:           150 ms
   USER SEES LIST → ⚠️ 20-25 сек

8-9. Fetch full:     32 сек (3-4 MB ÷ 1 Mbps)
10. Render:          500 ms
    FULL LIST READY → ❌ 35-40 сек (unacceptable)
```

### Повторный запрос (< 5 мин)

```
Browser cache hit:
├─ 304 Not Modified (headers only, 0.5 KB)
├─ Served from memory
└─ TOTAL: < 1 сек ✅ (regardless of network speed)
```

---

## 8. ИТОГОВАЯ ТАБЛИЦА

```
┌──────────────────────┬──────────────┬─────────────┬─────────────┐
│ Сценарий             │ 4G (20 Mbps) │ 4G (5 Mbps) │ 3G (1 Mbps) │
├──────────────────────┼──────────────┼─────────────┼─────────────┤
│ Холодный старт       │ 5-7 сек      │ 12-15 сек   │ 35-40 сек   │
│ (до partial list)    │ ✅           │ ✅          │ ❌          │
├──────────────────────┼──────────────┼─────────────┼─────────────┤
│ Полный каталог       │ 10-15 сек    │ 15-20 сек   │ 40-50 сек   │
│ (все 10k)            │ ✅           │ ✅          │ ❌          │
├──────────────────────┼──────────────┼─────────────┼─────────────┤
│ Повторный запрос     │ < 1 сек      │ < 1 сек     │ < 1 сек     │
│ (cache hit)          │ ✅           │ ✅          │ ✅          │
├──────────────────────┼──────────────┼─────────────┼─────────────┤
│ Фильтрация (10k)     │ 10-30 ms     │ 20-50 ms    │ 50-100 ms   │
│ (в браузере)         │ ✅           │ ✅          │ ✅          │
├──────────────────────┼──────────────┼─────────────┼─────────────┤
│ Expand row stats     │ 200-500 ms   │ 500-1000 ms │ 2-5 сек     │
│ (per-strategy)       │ ✅           │ ✅          │ ⚠️          │
└──────────────────────┴──────────────┴─────────────┴─────────────┘

✅ = Acceptable
⚠️ = Noticeable delay but usable
❌ = Unacceptable, needs optimization
```

---

## 9. FINAL RECOMMENDATIONS

### 🎯 Для текущего продакшена (5k DAU развитые страны)

```
DO:
✅ Включить R2 Worker (catalogBase parameter)
   └─ 1-2 строки конфиг, огромное улучшение latency

✅ Проверить Content-Encoding headers
   └─ Убедиться gzip работает (server.js line 53-65 ok)

✅ Добавить monitoring
   └─ Track: bandwidth per user, latency percentiles

✅ Документировать требования
   └─ "Рекомендуется 4G+ для оптимального опыта"

DON'T:
❌ Не парить на advanced optimizations сейчас
   └─ Field aliasing, Brotli, Service Worker — premature
   └─ Wait for actual 3G user complaints
```

### 📈 Если появятся 3G пользователи

```
PRIORITIZE:
1. Essential-only payload (0.5 MB vs 3-4 MB) → -80% bandwidth
2. Network Information API detection → auto-adapt
3. Field aliasing (short keys) → -40% JSON size
4. Service Worker → offline fallback

Expected outcome:
├─ 3G users: 280s → 4s (essential) + 16s (full async) ✅
├─ 4G users: no regression (still < 1 sec cached)
└─ New 5G users: 2-3 sec cold start (no improvement, already fast)
```

### 🚀 Long-term (wenn scaling zu 100k DAU)

```
Consider:
├─ GraphQL API → query only needed fields
├─ Delta compression → send only changed rows
├─ Client-side SQLite → local persistence
└─ Native apps → full offline support
```
