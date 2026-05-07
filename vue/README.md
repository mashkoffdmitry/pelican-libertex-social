# @mashkoffdmitry/pelican-vue

Vue 3 component for browsing Libertex Social copy-trading strategies via a
[`pelican-libertex-social`](../README.md) proxy. Drop it into any Vue 3 app
that can reach a running proxy (the proxy handles OIDC token refresh and
upstream rate-limiting; this component only consumes its REST surface).

## Install

```sh
npm install @mashkoffdmitry/pelican-vue vue
```

## Use

```vue
<script setup lang="ts">
import { PelicanLibertexSocial } from '@mashkoffdmitry/pelican-vue';
import '@mashkoffdmitry/pelican-vue/style.css';
</script>

<template>
  <PelicanLibertexSocial api-base="https://your-proxy.example.com" />
</template>
```

## Props

| prop             | type                              | default          | notes                                    |
| ---------------- | --------------------------------- | ---------------- | ---------------------------------------- |
| `apiBase`        | `string` (required)               | —                | Base URL of the pelican proxy            |
| `theme`          | `'auto' \| 'dark' \| 'light'`     | `'auto'`         | Persists in `localStorage['pelican-theme']` |
| `defaultSort`    | `SortKey`                         | `'return-desc'`  | One of 20 sort modes                     |
| `defaultFilters` | `Partial<FiltersState>`           | `{}`             | Initial filter values                    |
| `locale`         | `string`                          | `'en-US'`        | Used for number/date formatting          |
| `pageSize`       | `number`                          | `20`             | Rows per page                            |

## Emits

| event              | payload                                                                | when                              |
| ------------------ | ---------------------------------------------------------------------- | --------------------------------- |
| `update:theme`     | `'auto' \| 'dark' \| 'light'`                                          | User cycled the theme toggle      |
| `select-strategy`  | `Strategy`                                                             | A row was expanded                |
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
