# @mashkoffdmitry/pelican-vue

Vue 3 component for browsing Libertex Social copy-trading strategies via a
[`pelican-libertex-social`](../README.md) proxy. Drop it into any Vue 3 app
that can reach a running proxy (the proxy handles OIDC token refresh and
upstream rate-limiting; this component only consumes its REST surface).

A live proxy is hosted at `https://labs-pelican-proxy.mctl.ai` — point
`api-base` at it to skip running your own.

## Install

This package lives on **GitHub Packages**, not the public npm registry, so
both `npm install` and any CI runner need to be authenticated.

**1. Create a Personal Access Token (classic)** at
<https://github.com/settings/tokens> with the single scope `read:packages`.
Treat it like any password.

**2. Configure `~/.npmrc`** (or your project's `.npmrc`):

```
@mashkoffdmitry:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=ghp_xxxxxxxxxxxxxxxxxxxx
```

In CI: write the same two lines from a secret. GitHub Actions has
[a built-in `GITHUB_TOKEN`][gh-actions-pkg] that works for `read:packages`.

[gh-actions-pkg]: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-with-a-personal-access-token

**3. Install**:

```sh
npm install @mashkoffdmitry/pelican-vue
```

`vue@^3.4` is a peer dependency — make sure it's already in your host app.

## Use

```vue
<script setup lang="ts">
import { PelicanLibertexSocial } from '@mashkoffdmitry/pelican-vue';
import '@mashkoffdmitry/pelican-vue/style.css';
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
