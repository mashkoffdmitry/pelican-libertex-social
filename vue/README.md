# @mashkovd/pelican-vue

Vue 3 component for browsing Libertex Social copy-trading strategies via a
[`pelican-libertex-social`](../README.md) proxy. Drop it into any Vue 3 app
that can reach a running proxy (the proxy handles OIDC token refresh and
upstream rate-limiting; this component only consumes its REST surface).

A live proxy is hosted at `https://labs-pelican-proxy.mctl.ai` — point
`api-base` at it to skip running your own.

## Install

```sh
npm install @mashkovd/pelican-vue
```

`vue@^3.4` is a peer dependency — make sure it's already in your host app.

## Use

```vue
<script setup lang="ts">
import { PelicanLibertexSocial } from '@mashkovd/pelican-vue';
import '@mashkovd/pelican-vue/style.css';
</script>

<template>
  <PelicanLibertexSocial api-base="https://labs-pelican-proxy.mctl.ai" />
</template>
```

That's it. The component handles everything else — fetching the catalog,
filters, sort, lazy enrichment, trade panels, theme toggle.

### CORS / dev-server proxy

If your host app and the Pelican proxy live on different origins, the
browser will block the cross-origin fetch unless the proxy explicitly
allows your origin (it does not, by default).

The cleanest workaround is to proxy `/api` through your own dev/prod
server:

```ts
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': 'https://labs-pelican-proxy.mctl.ai',
    },
  },
});
```

…and pass an empty `api-base` so the component issues relative requests:

```vue
<PelicanLibertexSocial api-base="" />
```

For Nuxt, declare a `routeRules` proxy. For Quasar, set `devServer.proxy`
in `quasar.config.js`.

## Props

| prop             | type                              | default          | notes                                    |
| ---------------- | --------------------------------- | ---------------- | ---------------------------------------- |
| `apiBase`        | `string` (required)               | —                | Base URL of the pelican proxy. Used for live per-strategy data (`/api/strategies/{id}`, `/stats`, `/signals/*`) and — unless `catalogBase` is set — for the catalog as well. |
| `catalogBase`    | `string`                          | `apiBase`        | Optional separate origin for the static catalog (`/api/strategies-full` and `/progress`). Point at a Cloudflare Worker fronting the R2 bucket to serve the catalog from the edge. When set, the component skips the partial-load polling loop and fetches the catalog in a single request. |
| `theme`          | `'auto' \| 'dark' \| 'light'`     | `'auto'`         | Persists in `localStorage['pelican-theme']` |
| `defaultSort`    | `SortKey`                         | `'return-desc'`  | One of 20 sort modes                     |
| `defaultFilters` | `Partial<FiltersState>`           | `{}`             | Initial filter values                    |
| `locale`         | `string`                          | `'en-US'`        | Used for number/date formatting          |
| `pageSize`       | `number`                          | `20`             | Rows per page                            |
| `welcome`        | `boolean`                         | `false`          | Show the Libertex Social welcome modal (video and how-to steps) on load and again 30 min after it is closed |
| `lang`           | `'en' \| 'ru' \| 'es'`            | `'en'`           | UI language; the header toggle cycles it at runtime. Persists in `localStorage['pelican-lang']` |
| `logoSrc`        | `string`                          | `'/logo.png'`    | Logo image URL for the header (and the welcome modal) |
| `linkParams`     | `string`                          | `''`             | Query params appended to every libertex.copy-trade.io link (strategy links and the header logo), e.g. `utm_source=site&utm_medium=widget`. Sanitised: plain keys only, re-encoded, a leading `?` is allowed |
| `persist`        | `boolean`                         | `true`           | Remember theme/language in `localStorage` (and read them back on load) |
| `fetchProgress`  | `boolean`                         | `true`           | With a separate `catalogBase`: also fetch `/api/strategies-full/progress` (feeds `builtAt` only) |

### Two-origin example (proxy + edge)

```vue
<PelicanLibertexSocial
  api-base="https://labs-pelican-proxy.mctl.ai"
  catalog-base="https://pelican-catalog-worker.example.workers.dev"
/>
```

The 5 MB catalog comes from the Worker (edge-cached, no auth, fast).
Per-strategy live calls — `/api/strategies/{id}`, stats, signals — still go
through the pelican-proxy, which holds the OIDC token.

## Emits

| event              | payload                                                                | when                              |
| ------------------ | ---------------------------------------------------------------------- | --------------------------------- |
| `update:theme`     | `'auto' \| 'dark' \| 'light'`                                          | User cycled the theme toggle      |
| `update:lang`      | `'en' \| 'ru' \| 'es'`                                                 | User cycled the language toggle   |
| `select-strategy`  | `Strategy`                                                             | A row was expanded or collapsed   |
| `expand-strategy`  | `Strategy`                                                             | A row was expanded (not on collapse) |
| `error`            | `{ code: 'no_token' \| 'fetch_failed' \| 'http_error' \| string, message }` | Network / proxy error             |

## Slots

- `#brand` — replace the default header/brand block.
- `#empty` — replace the empty-state copy when filters match nothing.
- `#row-actions` — append controls to each row (`{ strategy }` slot scope).

## Dev

```sh
cd vue
npm install
npm run dev      # Vite playground at :5173, proxies /api → :8787
npm run build    # produces dist/ (ESM + UMD + style.css + .d.ts)
```

## License

MIT
