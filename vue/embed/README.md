# Pelican embeddable widget (`pelican-widget.js`)

[Русский](#русский) · [English](#english)

---

## Русский

Самодостаточная сборка каталога Libertex Social для встраивания на чужие страницы
(libertex.org, fxclub.org). Один классический скрипт: внутри Vue, компонент, весь CSS,
шрифт Manrope и картинки. Каталог рендерится в Shadow DOM, поэтому CSS сайта на него не
влияет, а CSS виджета не влияет на сайт. npm-пакет `@mashkovd/pelican-vue` и страница
прокси (`/widget/*`) от этой сборки не зависят: `vite build` по умолчанию собирает их как
раньше.

### Сборка

```bash
cd vue
npm ci
npm run build:embed      # vue-tsc (tsconfig.embed.json) + vite build --config vite.embed.config.ts
npm run preview:embed    # http://localhost:4180/demo.html
```

Результат в `vue/dist-embed/` (всё это уходит в бакет):

| Файл | Что это |
|---|---|
| `pelican-widget.js` | IIFE, ~320 КБ, ~158 КБ gzip. Чистый ASCII. Шрифты и картинки внутри как data: URI |
| `frame.html` | запасной вариант для iframe (CSP meta внутри) |
| `demo.html`, `demo-hosts/*.css` | страница для QA: оба способа встраивания, EN и RU, переключатель CSS сайтов |
| `OFL-Manrope.txt` | лицензия шрифта Manrope (SIL OFL 1.1) |

Сборка падает, если постобработка CSS не нашла ровно ожидаемое число совпадений
(см. `embed/build/plugin.ts`). В выходе не может быть `url(/`, `fonts.googleapis`,
`process.env`. Значит, после изменений в компоненте CI сам скажет, что сборку виджета
надо посмотреть.

Переменные окружения сборки (необязательные):

| Переменная | По умолчанию |
|---|---|
| `PELICAN_API_BASE` | `https://labs-pelican-proxy.mctl.ai` (живые данные: карточка стратегии, сделки) |
| `PELICAN_CATALOG_BASE` | `https://pelican-catalog-worker.pelican-libertex.workers.dev` (каталог) |
| `CI_COMMIT_SHORT_SHA` / `GITHUB_SHA` | добавляется к `LibertexSocialWidget.version` |

Версия = `version` из **корневого** `package.json` (это же имя папки в S3 в корпоративном
пайплайне) + `+<sha>`.

### Сниппеты

`<CDN_HOST>` — публичный адрес перед `s3://prod-libertex-social-trading` (уточнить у DevOps).

libertex.org/platforms/social-trading (EN):

```html
<div data-libertex-social-catalog
     data-lang="en"
     data-theme="dark"
     data-link-params="utm_source=libertex.org&amp;utm_medium=widget&amp;utm_campaign=social_trading_catalog">
  <a href="https://libertex.copy-trade.io/">Libertex Social: copy trading strategies</a>
</div>
<script src="https://<CDN_HOST>/latest/pelican-widget.js" defer></script>
```

www.fxclub.org/social-trading (RU):

```html
<div data-libertex-social-catalog
     data-lang="ru"
     data-theme="dark"
     data-link-params="utm_source=fxclub.org&amp;utm_medium=widget&amp;utm_campaign=social_trading_catalog">
  <a href="https://libertex.copy-trade.io/">Libertex Social: стратегии копитрейдинга</a>
</div>
<script src="https://<CDN_HOST>/latest/pelican-widget.js" defer></script>
```

Ссылка внутри `div` видна, только если скрипт не загрузился. Если тема Drupal подключает
скрипт сама, редактору достаточно вставить `div`. Двойное подключение скрипта безопасно
(вторая копия ничего не делает). Жёсткая фиксация версии: `/<version>/` вместо `/latest/`.

Вариант с custom element: `<libertex-social-catalog lang="ru" theme="dark"></libertex-social-catalog>`
(атрибуты те же, с `data-` или без).

### Атрибуты

| Атрибут | Значения | По умолчанию |
|---|---|---|
| `data-lang` | `en`, `ru`, `es` | `<html lang>` страницы, иначе `en` |
| `data-theme` | `dark`, `light`, `auto` | `dark`. Посетитель всё равно может переключить тему в шапке виджета |
| `data-blobs` | `on`, `off` | `on` (фоновые «пятна», как в оригинале) |
| `data-lazy` | `on`, `off` | `on`: монтирование, когда до виджета остаётся ~800 px прокрутки |
| `data-locale` | BCP 47, например `en-US` | `en-US` (формат чисел) |
| `data-link-params` | query string | пусто. Проходят только `utm_*` и `ref`, `partner`, `aff_id`, `sub_id`, `click_id`, `promo`; добавляются к ссылкам на libertex.copy-trade.io |
| `data-datalayer` | `off` | включено |
| `data-api-base`, `data-catalog-base` | абсолютный `https://` URL | значения сборки. Относительные, `http:` и одинаковые адреса отклоняются с предупреждением в консоли |

Приветственное окно с видео в виджете выключено, тема и язык в `localStorage` сайта не пишутся.

### События

На элементе-хосте (`bubbles`, `composed`), `event.detail`:

| Событие | detail | dataLayer |
|---|---|---|
| `libertex-social:ready` | `{version, lang}` — появились строки каталога | `pelican_ready` |
| `libertex-social:error` | `{message, code, status}` | `pelican_error` |
| `libertex-social:strategy-open` | `{strategyId, name}` | — |
| `libertex-social:subscribe-click` | `{strategyId, href}` | `pelican_subscribe_click` с `strategy_id` |

`window.dataLayer` создаётся, если его нет (обычный контракт GTM). Отключить: `data-datalayer="off"`.

### JS API (SPA)

```js
const w = LibertexSocialWidget.mount(el, { lang: 'ru', theme: 'dark' });
w.update({ lang: 'en', blobs: false });   // lang/theme/blobs/linkParams без перемонтирования
w.unmount();
LibertexSocialWidget.scan();              // найти новые [data-libertex-social-catalog]
LibertexSocialWidget.version;             // "1.2.0+abc1234"
```

Элементы, добавленные в DOM позже, находятся автоматически (MutationObserver); удалённые
размонтируются.

### Запасной вариант: iframe

Если Drupal вырезает `div` с `data-*` или `<script>`:

```html
<iframe data-libertex-social-frame
  src="https://<CDN_HOST>/latest/frame.html?lang=ru&amp;theme=dark&amp;utm_source=fxclub.org&amp;utm_medium=widget&amp;utm_campaign=social_trading_catalog"
  title="Libertex Social" loading="lazy"
  style="display:block;width:100%;height:1600px;border:0"></iframe>
<!-- необязательно: автовысота и события в dataLayer родителя -->
<script src="https://<CDN_HOST>/latest/pelican-widget.js" defer></script>
```

- `frame.html` принимает только `lang`, `theme`, `blobs`, `locale`, `utm_*`; адреса API в
  iframe не переопределяются.
- С `pelican-widget.js` на странице iframe получает высоту по содержимому (postMessage,
  проверка `source` и `origin`) и пересылает события: они приходят как CustomEvent на
  элемент `iframe` и в `dataLayer` родителя (`data-datalayer="off"` на iframe отключает).
  Скрипт находит iframe по `data-libertex-social-frame`, а если CMS вырезала атрибут — по
  адресу `.../frame.html` на том же origin, что и скрипт. Скрипт может загрузиться и позже.
- Без скрипта iframe остаётся высотой 1600 px с внутренней прокруткой.
- `sandbox` не ставить; если обязателен — только
  `allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox`.

### Drupal 10

CKEditor 5 в форматах Basic/Full HTML по умолчанию вырезает `<script>`, а часто и
незнакомые `data-*`. Варианты (договориться с администраторами):
1. текстовый формат Full HTML с Source editing и разрешёнными `<script src>` и `<div data-*>`;
2. custom block с этим HTML в формате без фильтра;
3. подключить `pelican-widget.js` как library темы (`*.libraries.yml`, `attributes: { defer: true }`),
   а редактору вставлять только `div`.

### CDN и кэш

- `latest/*`: `Cache-Control: max-age` не больше 300 или инвалидация в job `release_*_latest`.
- `<version>/*`: можно `immutable` — но только если корневой `package.json` в GitLab не
  откатывается при синхронизации с GitHub (иначе папка версии перезапишется).
- gzip/brotli для `.js` и `.html`. На `frame.html` не должно быть `X-Frame-Options` и CSP
  `frame-ancestors`. CORS не нужен (классический скрипт, не модуль).
- Проверить `Content-Type` через `curl -I`: `.js` → `application/javascript`, `.html` → `text/html`.

### Корпоративный GitLab (micro-frontend)

Переменные в корпоративном `.gitlab-ci.yml` (только в GitLab; при синхронизации не затирать
его и корневые `package.json`/`package-lock.json`):

```
PRE_BUILD_COMMAND="npm ci --prefix vue --include=dev"
BUILD_COMMAND="npm --prefix vue run build:embed"
BUILD_DIR="vue/dist-embed"
BUILD_CACHE_DIR="vue/node_modules"
```

`BUILD_COMMAND` — обязательно одна команда (`$BUILD_COMMAND` раскрывается без `sh -c`),
поэтому цепочка `vue-tsc && vite build` живёт внутри npm-скрипта. Шаблон добавит
`/* version X */` в начало `pelican-widget.js` — IIFE это не ломает. Откат — повторный
запуск release-job для предыдущей версии.

### Как устроено

- Shadow DOM (`attachShadow({mode:'open'})`), CSS через `adoptedStyleSheets` (запасной
  вариант — `<style>`), обёртка `.pel-root { all: initial }` отсекает наследуемые свойства
  сайта. Все CSS-переменные, которые использует компонент, определены на его корне
  (сборка это проверяет): переменные с `:root` сайта не протекают.
- Шрифт Manrope (переменный, 200–800, те же поднаборы, что у Google Fonts) регистрируется
  один раз на уровне документа через FontFace API под именем `'Pelican Manrope'`
  (`@font-face` внутри shadow root браузеры игнорируют). Запросов к Google нет.
- `@media (max-width)` компонента превращены в `@container`: раскладка зависит от ширины
  виджета, а не окна. Фильтры уходят за кнопку «Filters», когда контейнер уже 1424 px
  (иначе обрезается Subscribe), строки становятся карточками при ширине до 1071 px.
  При 1072–1079 px боковые отступы 24 px (колонка fxclub.org — ровно 1072 px).
- «Пятна» остаются `position: fixed`, как на полной странице, но обрезаются по виджету
  (`clip-path: inset(0)`); `min-height` 720 px вместо 100vh.

---

## English

Self-contained build of the Libertex Social catalog for third-party pages (libertex.org,
fxclub.org). One classic script with Vue, the component, all CSS, the Manrope font and the
images inside. The catalog renders into a Shadow DOM, so the site's CSS cannot touch it and
its CSS cannot touch the site. The npm package `@mashkovd/pelican-vue` and the proxy's own
page (`/widget/*`) do not depend on it: the default `vite build` is unchanged.

### Build

```bash
cd vue
npm ci
npm run build:embed      # vue-tsc (tsconfig.embed.json) + vite build --config vite.embed.config.ts
npm run preview:embed    # http://localhost:4180/demo.html
```

Output in `vue/dist-embed/` (all of it goes to the bucket): `pelican-widget.js` (IIFE,
~320 KB, ~158 KB gzip, pure ASCII, fonts and images inlined), `frame.html` (iframe
fallback with a CSP meta), `demo.html` + `demo-hosts/*.css` (QA page), `OFL-Manrope.txt`.

The build fails if a CSS rewrite does not match exactly the expected number of times
(`embed/build/plugin.ts`), or if `url(/`, `fonts.googleapis` or `process.env` reach the
output. Optional build env: `PELICAN_API_BASE`, `PELICAN_CATALOG_BASE` (default
endpoints), `CI_COMMIT_SHORT_SHA` / `GITHUB_SHA` (appended to the version). The version is
the **root** `package.json` version (the S3 folder name in the corp pipeline).

### Snippets

libertex.org (EN):

```html
<div data-libertex-social-catalog data-lang="en" data-theme="dark"
     data-link-params="utm_source=libertex.org&amp;utm_medium=widget&amp;utm_campaign=social_trading_catalog">
  <a href="https://libertex.copy-trade.io/">Libertex Social: copy trading strategies</a>
</div>
<script src="https://<CDN_HOST>/latest/pelican-widget.js" defer></script>
```

fxclub.org (RU):

```html
<div data-libertex-social-catalog data-lang="ru" data-theme="dark"
     data-link-params="utm_source=fxclub.org&amp;utm_medium=widget&amp;utm_campaign=social_trading_catalog">
  <a href="https://libertex.copy-trade.io/">Libertex Social: стратегии копитрейдинга</a>
</div>
<script src="https://<CDN_HOST>/latest/pelican-widget.js" defer></script>
```

Or `<libertex-social-catalog lang="ru" theme="dark"></libertex-social-catalog>`.
Loading the script twice is harmless. Pin a version with `/<version>/` instead of `/latest/`.

### Attributes

`data-lang` (`en|ru|es`, default: page `<html lang>`, else `en`) · `data-theme`
(`dark|light|auto`, default `dark`; visitors can still toggle) · `data-blobs` (`on|off`,
default `on`) · `data-lazy` (`on|off`, default `on`, mounts ~800 px before the viewport) ·
`data-locale` (default `en-US`) · `data-link-params` (only `utm_*` and `ref`, `partner`,
`aff_id`, `sub_id`, `click_id`, `promo` pass; appended to libertex.copy-trade.io links) ·
`data-datalayer="off"` · `data-api-base` / `data-catalog-base` (absolute `https://` only,
must differ; otherwise a console warning and the build defaults). No welcome modal, no
`localStorage` writes on the host.

### Events

CustomEvents on the host element (bubbles, composed): `libertex-social:ready`
`{version, lang}`, `libertex-social:error` `{message, code, status}`,
`libertex-social:strategy-open` `{strategyId, name}`, `libertex-social:subscribe-click`
`{strategyId, href}`. `window.dataLayer` gets `pelican_ready`, `pelican_error`,
`pelican_subscribe_click` (`strategy_id`) unless `data-datalayer="off"`.

### JS API

`LibertexSocialWidget.mount(el, opts)` → `{update(opts), unmount()}`;
`LibertexSocialWidget.scan()`; `LibertexSocialWidget.version`. Elements added later are
picked up by a MutationObserver, removed ones are unmounted.

### iframe fallback

```html
<iframe data-libertex-social-frame
  src="https://<CDN_HOST>/latest/frame.html?lang=ru&amp;theme=dark&amp;utm_source=fxclub.org&amp;utm_medium=widget"
  title="Libertex Social" loading="lazy" style="display:block;width:100%;height:1600px;border:0"></iframe>
<script src="https://<CDN_HOST>/latest/pelican-widget.js" defer></script>  <!-- optional -->
```

`frame.html` honours only `lang`, `theme`, `blobs`, `locale`, `utm_*`. With the script on
the parent page the iframe is auto-sized (postMessage handshake with retries; `source` and
`origin` checked) and its events are re-dispatched on the `iframe` element and pushed to
the parent's `dataLayer`. The script finds the iframe by `data-libertex-social-frame` or,
if a CMS stripped it, by a `.../frame.html` src on the script's own origin; it may also load
late. Without it the iframe keeps 1600 px with an inner scrollbar. Do not add `sandbox`
(if required: `allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox`).

### Drupal 10

CKEditor 5 strips `<script>` (and often unknown `data-*`) in Basic/Full HTML. Ask the site
admins for a Full HTML format with Source editing that allows `<script src>` and
`<div data-*>`, a custom block in an unfiltered format, or a theme library
(`*.libraries.yml`, `defer`) so editors only paste the `div`.

### CDN / cache

`latest/*`: `max-age` ≤ 300 s or invalidation in `release_*_latest`; `<version>/*` may be
`immutable` only if the root `package.json` in GitLab is never rolled back by a GitHub sync.
gzip/brotli for `.js`/`.html`; no `X-Frame-Options` / `frame-ancestors` on `frame.html`;
no CORS needed.

### Corp GitLab micro-frontend pipeline

```
PRE_BUILD_COMMAND="npm ci --prefix vue --include=dev"
BUILD_COMMAND="npm --prefix vue run build:embed"
BUILD_DIR="vue/dist-embed"
BUILD_CACHE_DIR="vue/node_modules"
```

`BUILD_COMMAND` must be a single command (it is expanded without `sh -c`). The template's
`/* version X */` banner on `pelican-widget.js` is safe for the IIFE. Keep the GitLab-only
`.gitlab-ci.yml` and root `package.json`/`package-lock.json` when syncing from GitHub.
Rollback = re-run the release job for the previous version.

### How it works

Shadow DOM + `adoptedStyleSheets` (`<style>` fallback) + `.pel-root { all: initial }`;
every custom property the component uses is defined on its root (checked at build time).
Manrope (variable 200–800, Google's subsets) is registered once per document via the
FontFace API as `'Pelican Manrope'`. The component's `@media (max-width)` rules become
`@container` rules: filters go behind the Filters button below a 1424 px container (else
Subscribe is cut), rows become cards up to 1071 px, 1072–1079 px get 24 px side padding
(fxclub.org's column is exactly 1072 px). The background blobs stay `position: fixed` like
on the full page but are clipped to the widget (`clip-path: inset(0)`); `min-height` is
720 px instead of 100vh.
