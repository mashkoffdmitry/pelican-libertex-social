# Pelican — Libertex Social viewer

A self-hosted, filterable mirror of the [Libertex Social](https://libertex.copy-trade.io/) copy-trading catalog. Browse 10,000+ strategies in one screen with sortable columns, range filters (Return %, Drawdown, Balance, Investment Amount, etc.), open trades, and 30-day trade history per strategy. Logs in to your own Libertex account, rotates the OAuth token automatically, caches the catalog daily.

> **Disclaimer.** Unofficial. You point it at your own Libertex Social account credentials. Not affiliated with Libertex Group.

There are three deployment surfaces:

1. **Self-hosted Windows VPS** — the original flow, documented end-to-end below. Headless Chrome + NSSM-managed services + ngrok tunnel. Use this if you have a Windows box.
2. **Containerized** — `Dockerfile` + `docker run` for self-hosting on any host that runs containers. See [Container deployment](#container-deployment).
3. **Cloud (mctl)** — autonomous in-cluster OIDC, no Chromium in the image, deployed via mctl. Operator-only; not user-facing.

![preview](docs/preview.png) <!-- optional; add later if you want a screenshot in the README -->

---

## Features

- **Full catalog cached locally** — daily 11:00 (Europe/Kyiv) rebuild, served from disk so the page loads in <1 s.
- **Live filters** — Risk, Return % (log scale), Max Drawdown, Balance dual-handle (log scale), Mgmt Fee, Copiers AUM, Copiers, Age, Trades, Win Rate, plus an "Investment Amount" input that auto-sets Balance bounds.
- **Open Trades / Trade History** — click-to-expand pill buttons inside each row, lazy-loaded from `/api/strategies/<id>/signals/{open,closed}`, scrollable on long histories.
- **Theme-aware** — dark/light, liquid-glass aesthetic with frosted panels and chrome-blob background accents.
- **Mobile-ready** — adaptive layout for laptops down to iPhone Pro Max widths; expanded card visibly tinted on mobile.
- **Self-healing catalog** — stale-while-revalidate semantics on the server cache; one-shot `patch-missing.js` to fill any rows the daily rebuild missed.

## Architecture

```
┌────────────┐     ┌──────────────────┐     ┌────────────────────┐
│  browser   │ ──▶ │  Pelican proxy   │ ──▶ │ papi.copy-trade.io │
│ (app.js)   │     │  (server.js)     │     │ (upstream API)     │
└────────────┘     └──────────────────┘     └────────────────────┘
                          │                  ▲
                          │ caches catalog   │ Bearer token
                          ▼                  │ (30-min lifetime)
                   ┌──────────────┐    ┌──────────────┐
                   │ .catalog.json│    │ refresher.js │
                   │ (10K+ items) │    │ (headless    │
                   └──────────────┘    │  Chrome      │
                                       │  login loop) │
                                       └──────────────┘
```

Three Windows services run on the VPS via NSSM:

| Service              | Process              | Purpose |
| -------------------- | -------------------- | ------- |
| `PelicanServer`      | `node server.js`     | The proxy + static-file server (port 8787). |
| `PelicanRefresher`   | `node refresher.js`  | Headless Chrome that re-logs into Libertex when the OAuth token nears expiry. |
| `PelicanNgrok`       | `ngrok http 8787 …`  | Public HTTPS tunnel via your reserved free `ngrok-free.dev` subdomain. |

## Requirements

- **Windows VPS** (tested on Windows Server 2022/2025; needs RDP / PowerShell access)
- **Node.js 22+** ([nodejs.org](https://nodejs.org))
- **ngrok** free account ([signup](https://dashboard.ngrok.com/signup)) with one reserved static domain
- **Libertex Social account** (the one whose data you want to display)

## Quick start

```powershell
# 1. Clone
git clone https://github.com/Yevhen79/pelican-libertex-social.git C:\PelicanSrc
cd C:\PelicanSrc

# 2. Configure
copy .env.example .env
notepad .env
# Fill in: LIBERTEX_EMAIL, LIBERTEX_PASSWORD, NGROK_AUTHTOKEN, NGROK_DOMAIN

# 3. Install (downloads ngrok + nssm, copies sources to C:\Pelican,
#    registers the three services and starts them)
PowerShell -ExecutionPolicy Bypass -File .\install.ps1

# 4. Verify
Get-Service PelicanServer, PelicanRefresher, PelicanNgrok
# All three should be Running.
```

The first daily catalog build takes ~25–35 minutes (it has to fetch meta+stats for every strategy). After that, partial data is served immediately on every page load and the catalog refreshes itself daily at 11:00 Kyiv time.

Open `https://<your-ngrok-domain>.ngrok-free.dev` and you're done.

See [DEPLOY.md](DEPLOY.md) and [README-VPS-Windows.md](README-VPS-Windows.md) for detailed setup, troubleshooting, and how the services hang together.

## Container deployment

A multi-stage `Dockerfile` ships in the repo root for self-hosting on any container runtime. The image (~150 MB) excludes Chromium — token acquisition is delegated either to an in-cluster OIDC client (cloud mode) or to a one-shot manual ingest from any browser (self-hosted mode).

```bash
docker build -t pelican .
docker run -d --name pelican \
  -e LIBERTEX_EMAIL=...                     \
  -e LIBERTEX_PASSWORD=...                  \
  -e INGEST_SECRET=$(openssl rand -hex 16)  \
  -p 8787:8787 pelican
```

`start.sh` supervises both `server.js` (proxy + static) and `refresher.js` (token loop) inside the container.

**Endpoints**

- `GET /healthz` — liveness probe; always 200 if the process is up.
- `GET /readyz` — readiness probe; 200 only once a non-expired token is held.
- `POST /__ingest` — emergency manual token push. Accepts `{ access_token, expires_at }` JSON. Allowed from localhost unconditionally; from any other origin requires header `X-Ingest-Secret: <INGEST_SECRET>`. Used to bootstrap when the in-cluster refresher hasn't acquired a token yet, or as an override during incident response.

The catalog file (`.catalog.json`) is **ephemeral** in container deploys — it lives inside the container's writable layer and is rebuilt on every restart (~25–35 min for the first build). Mount a volume at `/app` if you want to persist it across restarts.

## Cloud deployment (mctl)

Operator-only. The same image is deployed to a managed cluster via mctl, where an in-cluster OIDC client (`oidc-client.js`) acquires the Libertex bearer token autonomously without a headless browser. End users never touch this path; refer to internal mctl runbooks.

## Maintenance

```powershell
# Logs
Get-Content C:\Pelican\logs\server.log -Tail 50
Get-Content C:\Pelican\logs\refresher.log -Tail 50
Get-Content C:\Pelican\logs\ngrok.log -Tail 50

# Restart everything
Restart-Service PelicanServer, PelicanRefresher, PelicanNgrok

# Force-rebuild the catalog (e.g. after upstream outages)
Remove-Item C:\Pelican\.catalog.json
Restart-Service PelicanServer

# Patch any rows the daily build missed (transient upstream errors)
cd C:\Pelican; node patch-missing.js
```

## Development

```bash
# Run the proxy locally (no Windows services)
node server.js
# Then in another shell, the refresher:
node refresher.js
```

The bundled frontend (`index.html`, `app.js`, `styles.css`) is plain vanilla JS — no build step. Edit and reload.

### Vue 3 component (`vue/`)

The same UI is also published as a standalone Vue 3 component, so you can embed the catalog into any Vue app without running the bundled HTML/JS.

```bash
npm install @mashkoffdmitry/pelican-vue
```

```ts
import { PelicanLibertexSocial } from '@mashkoffdmitry/pelican-vue';
import '@mashkoffdmitry/pelican-vue/style.css';
```

```vue
<PelicanLibertexSocial
  :api-base="'/api'"
  theme="auto"
  default-sort="return-desc"
  :default-filters="{}"
  locale="en-US"
  :page-size="100"
  @select-strategy="(s) => console.log(s.Id)"
  @error="(e) => console.warn(e.code, e.message)"
/>
```

**Props**

| Prop             | Type                          | Required | Notes |
| ---------------- | ----------------------------- | -------- | ----- |
| `apiBase`        | `string`                      | yes      | Base URL of the Pelican proxy. Pass `''` (or your dev-server origin with a `/api` proxy entry) to fetch via the dev origin and avoid CORS. |
| `theme`          | `'auto' \| 'light' \| 'dark'` | no       | Default `'auto'`. |
| `defaultSort`    | `SortKey`                     | no       | Default `'return-desc'`. |
| `defaultFilters` | `Partial<FiltersState>`       | no       | Override any of the range filters at mount time. |
| `columns`        | `ColumnKey[]`                 | no       | Reserved; not yet wired through. |
| `locale`         | `string`                      | no       | Default `'en-US'`; used for number/date formatting. |
| `pageSize`       | `number`                      | no       | Rows per page. |

**Slots**

- `#brand` — replace the header brand mark.
- `#empty` — content shown when no rows match the filters.
- `#row-actions` — extra buttons rendered inside each expanded row.

**Build outputs** (Vite library mode, `vue/dist/`):

- ESM: `pelican-libertex-social.mjs` (~55 KB)
- UMD: `pelican-libertex-social.umd.cjs` (~44 KB)
- Styles: `style.css` (~12 KB)
- Types: `pelican-libertex-social.d.ts`

`vue` itself is an external peer dependency, not bundled.

## License

MIT — see [LICENSE](LICENSE).

Personal data, design assets, and `.env` secrets stay out of the repo (see `.gitignore`). Each user runs against their own Libertex account.
