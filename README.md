# Pelican — Libertex Social viewer

A read-only proxy + Vue 3 component for browsing the [Libertex Social](https://libertex.copy-trade.io/) copy-trading catalog. The proxy logs in to your own Libertex account, autonomously rotates the OAuth token, caches the catalog, and serves a clean REST API. The Vue 3 component renders the full UI (filters, sort, sparklines, trade panels) on top of that API.

> **Disclaimer.** Unofficial. Point at your own Libertex Social credentials. Not affiliated with Libertex Group.

## What ships

| Artifact | Where |
|---|---|
| **Proxy container** | [`Dockerfile`](Dockerfile) — `node:22-alpine` (~150 MB), pure-Node OIDC client, no Chromium. A live instance runs at `https://labs-pelican-proxy.mctl.ai`. |
| **Vue 3 component** | [`@mashkovd/pelican-vue`](https://www.npmjs.com/package/@mashkovd/pelican-vue) on npmjs.com. Source in [`vue/`](vue/). |
| **Catalog edge worker** | Cloudflare Worker + R2 bucket fronting `/api/strategies-full`. Source in [`worker/`](worker/). Optional — proxy works standalone. |

## Architecture

```
┌──────────────┐     ┌────────────────────┐     ┌────────────────────┐
│  host app    │ ──▶ │  Pelican proxy     │ ──▶ │ papi.copy-trade.io │
│ (Vue 3       │     │  server.js +       │     │   (upstream API)   │
│  component)  │     │  oidc-client.js +  │     └────────────────────┘
└──────────────┘     │  refresher.js      │
                     └────────────────────┘
                            │ caches
                            ▼
                     /tmp/.catalog.json
                     (ephemeral, rebuilt
                      on pod restart;
                      daily at 11:00 Kyiv)
```

`refresher.js` walks `authorization_code+PKCE` against `identity.copy-trade.io` directly with `fetch` + `tough-cookie`, drops the token into `$ENV_PATH`, and rotates it before expiry (refresh_token grant first → silent renew → full re-login fallback).

## Run as a container

```bash
docker build -t pelican .

docker run -d --name pelican \
  -e LIBERTEX_EMAIL=...                     \
  -e LIBERTEX_PASSWORD=...                  \
  -e INGEST_SECRET=$(openssl rand -hex 32)  \
  -p 8787:8787 pelican

# /healthz returns 200 immediately. /readyz flips to 200 after the
# initial OIDC login completes (~3-5 s).
curl http://localhost:8787/healthz
curl http://localhost:8787/readyz
curl http://localhost:8787/api/strategies?filter=gold
```

`INGEST_SECRET` gates `POST /__ingest` for emergency manual token pushes from outside the container; localhost POSTs are allowed unconditionally.

The catalog (`.catalog.json`) lives in the writable layer and is **ephemeral**. Mount a volume at `/app` to persist across restarts; otherwise the first request after a restart triggers a ~3-4 min full rebuild.

### Optional: offload the catalog to Cloudflare R2

To stop serving the 5 MB catalog from k8s and give it edge-cached, the proxy
can push every freshly-built catalog to a Cloudflare Worker (which writes it
to an R2 bucket and serves it back). Set:

- `CATALOG_INGEST_URL` — `https://<your-worker>.workers.dev/__ingest`
- `CATALOG_INGEST_SECRET` — must match `INGEST_SECRET` set on the Worker

When unset, the upload step is skipped silently and the proxy keeps serving
`/api/strategies-full` directly. See [`worker/README.md`](worker/README.md)
for one-time Worker deploy instructions.

## Use the Vue component

```bash
npm install @mashkovd/pelican-vue
```

```vue
<script setup lang="ts">
import { PelicanLibertexSocial } from '@mashkovd/pelican-vue';
import '@mashkovd/pelican-vue/style.css';
</script>

<template>
  <PelicanLibertexSocial api-base="https://labs-pelican-proxy.mctl.ai" />
</template>
```

Full props/emits/slots reference and CORS workarounds (Vite/Nuxt/Quasar dev-server proxy) in [`vue/README.md`](vue/README.md).

## API endpoints

| Endpoint | Purpose |
|---|---|
| `GET /` | Service identity JSON (proxy name, npm package URL, repo URL, endpoint list) |
| `GET /healthz` | Liveness probe — always 200 if the process is up |
| `GET /readyz` | Readiness probe — 200 only when a non-expired token is held |
| `GET /__status` | Public token TTL info (no token leakage) |
| `POST /__ingest` | Manual token push. Localhost OR header `X-Ingest-Secret: $INGEST_SECRET` |
| `GET /api/strategies?filter=…` | Lightweight name search |
| `GET /api/strategies-full` | Full enriched catalog (10 K+ items, ~5 MB gzipped) |
| `GET /api/strategies-full/progress` | Build progress polling (`{ ready, building, loaded, total }`) |
| `GET /api/strategies/{id}` | Strategy metadata |
| `GET /api/strategies/{id}/stats` | Performance + trade history |
| `GET /api/strategies/{id}/signals/{open\|closed}` | Open / 30-day-closed trades |

## Development

```bash
# Proxy + refresher (in two shells, or use start.sh)
node server.js
node refresher.js

# Vue component playground (Vite, hits proxy via /api proxy)
cd vue && npm install && npm run dev
```

CI runs `vue-tsc --noEmit`, `node -c` against the proxy files, and a Docker build on every push to `main` and every PR — see [`.github/workflows/ci.yml`](.github/workflows/ci.yml). On pushes to `main` the workflow also auto-bumps the patch SemVer tag and triggers an mctl deploy to `labs-pelican-proxy.mctl.ai`.

## License

MIT — see [LICENSE](LICENSE). Each user runs against their own Libertex account.
