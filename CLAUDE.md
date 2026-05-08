# Pelican — orientation for Claude

This file is auto-loaded by Claude Code in this project. It captures
the non-obvious facts you would otherwise spend a session re-discovering.

## What this is

A read-only proxy (`server.js`) that mirrors the Libertex Social
copy-trading catalog and serves a clean REST API, plus a Vue 3 component
(`vue/`) that renders the catalog UI on top of that API. Two shipping
artifacts:

- **Proxy container** — `Dockerfile` → `ghcr.io/mctlhq/pelican-proxy:<tag>` → `https://labs-pelican-proxy.mctl.ai`
- **Vue 3 component** — [`@mashkovd/pelican-vue`](https://www.npmjs.com/package/@mashkovd/pelican-vue) on public npmjs
- **Catalog edge worker** — Cloudflare Worker (`worker/`) + R2 bucket `pelican-catalog`. Proxy pushes the freshly-built catalog after every rebuild; Worker serves it on the edge. Optional — proxy still serves `/api/strategies-full` itself when worker isn't configured.

## Where things live

| File | Role |
|---|---|
| `server.js` | HTTP proxy: `/healthz`, `/readyz`, `/__ingest` (`X-Ingest-Secret`), `/__status`, `/api/*` whitelisted to `papi.copy-trade.io`. Catalog cache in `/tmp/.catalog.json` (ephemeral). |
| `refresher.js` | Loop that calls `oidc-client.js` to rotate the access token before expiry. |
| `oidc-client.js` | Pure-Node `authorization_code+PKCE` walk against `identity.copy-trade.io`. **Critical:** `followRedirects` decodes `&amp;` in Location headers — IdP returns HTML-entity-encoded ampersands and `URL()` chokes on them. Don't remove that. |
| `start.sh` | Supervises `server.js` + `refresher.js`. **busybox-compatible** — `wait -n` doesn't exist on Alpine, uses `kill -0` poll loop instead. |
| `Dockerfile` | `node:22.11-alpine3.20` pinned, tini, non-root user `app`, HEALTHCHECK on `/healthz`. |
| `vue/` | Vue 3 SFC + Vite library mode → `@mashkovd/pelican-vue` on npmjs. Decoupled SemVer from the proxy. |
| `worker/` | Cloudflare Worker — `GET /api/strategies-full(/progress)` from R2 bucket `pelican-catalog`, `POST /__ingest` for proxy pushes. Deploy: `cd worker && npx wrangler deploy`. |
| `r2-uploader.js` | After each `buildFull()`, server.js POSTs the catalog (gzipped) to the Worker if `CATALOG_INGEST_URL` + `CATALOG_INGEST_SECRET` are set; else skips silently. |
| `.github/workflows/ci.yml` | `vue` + `proxy-syntax` (always), `docker` (PR-only gate), `deploy` (push-to-main only). |
| `.env` | Gitignored, mode 600. Holds `LIBERTEX_EMAIL`, `LIBERTEX_PASSWORD`, `INGEST_SECRET`, plus runtime tokens. Optionally `CATALOG_INGEST_URL` + `CATALOG_INGEST_SECRET` for Worker push. |

## Production

- **URL:** https://labs-pelican-proxy.mctl.ai
- **mctl:** team `labs`, service `pelican-proxy`
- **GitOps manifest:** `mctlhq/mctl-gitops` → `platform-gitops/services/labs/pelican-proxy/values.yaml`
- **Image registry:** `ghcr.io/mctlhq/pelican-proxy:<git-tag>` (built by mctl, not by GH Actions)

## Deploy flow (CD)

Push to `main` → CI auto-bumps SemVer patch tag (e.g. `0.2.2 → 0.2.3`) →
pushes tag → curls `https://api.mctl.ai/api/v1/operations/deploy-service/execute` →
mctl builds image + commits gitops → ArgoCD syncs. **~3 min from `git push` to live.**

The `deploy` job is gated by GitHub Actions secret `MCTL_GITHUB_TOKEN`
(classic PAT, scope `read:user`). If unset, the job skips with a warning
instead of failing — so a fresh fork doesn't break CI before you set up
the secret.

**Manual deploy:**
```
mctl_deploy_service action=deploy team_name=labs component_name=pelican-proxy \
  git_tag=X.Y.Z dockerfile_repo=mashkoffdmitry/pelican-libertex-social
```

**Rollback:** `mctl_rollback_service team=labs name=pelican-proxy image_tag=<prev-tag>`

## Vue component publishing

`@mashkovd/pelican-vue` is on **npmjs.com** (public, anonymous install — switched there from GitHub Packages because GHP requires auth even for public packages). Independent SemVer from proxy.

To publish a new version:
```
cd vue
# bump "version" in package.json (e.g. 0.2.0 → 0.2.1)
echo '//registry.npmjs.org/:_authToken=<npm-granular-token>' > ~/.npmrc
npm run build
npm publish    # 2FA bypassed only by granular tokens with that flag enabled
rm ~/.npmrc    # don't leave the token sitting around
```

The npm scope `@mashkovd` is owned by user `mashkovd` on npmjs.com.
Granular access tokens (https://www.npmjs.com/settings/mashkovd/tokens)
must have **"Bypass two-factor authentication when publishing"**
enabled, otherwise `npm publish` 403s on accounts with 2FA.

## Conventions

- **Tags:** NO `v` prefix (`0.2.3`, not `v0.2.3`).
- **Commits:** conventional, no `Co-Authored-By:` trailer.
- **mctl ops** are MCP-only — but tenant quota changes have no MCP op,
  edit `mctlhq/mctl-gitops/platform-gitops/tenants/<team>/values.yaml`
  directly under admin gh identity. Same goes for any other tenant-level
  config that's not exposed as an `mctl_*` operation.

## Common gotchas

- **IdP `&amp;` Location bug:** `identity.copy-trade.io` returns
  HTML-entity-encoded ampersands in 302 Location headers. `oidc-client.js`
  decodes them in `followRedirects`. If a fresh OIDC walk starts failing
  with `invalid_request` after the form POST, the IdP probably regressed
  the encoding fix or added a new HTML entity (`&apos;`, etc.).
- **Stuck workflow rollback race:** if a `deploy-service` workflow sits
  Pending (e.g. behind tenant quota) and is admitted hours later, its
  `commit` step can rewrite gitops with a stale image tag — overwriting
  a newer deploy. See `~/.claude/projects/.../memory/stuck_workflow_rollback.md`
  for the incident write-up. Mitigation: don't unblock old Pending
  workflows once newer ones have shipped.
- **labs CPU quota:** four baseline service pods sit at ~5100m used.
  `limits.cpu` is currently 8 (bumped 2026-05-08 from 6). Workflow
  scaffold pods need 1000m each. If the tenant grows another service,
  bump again — see `labs_tenant_quota.md` in memory for the procedure.
- **`MCTL_GITHUB_TOKEN`** is a classic GH PAT with scope `read:user`.
  mctl-api validates it against `api.github.com/user` and maps the
  identity to tenant access. Can NOT use a granular token (no scope to
  pick).
- **Cloudflare Worker double-gzip:** if you store a gzipped catalog on R2 and
  serve it back with `Content-Encoding: gzip`, CF's edge re-compresses on
  egress when the client sends `Accept-Encoding: gzip` → gzip-of-gzip,
  garbage in the browser. The fix in `worker/src/index.ts` is to store the
  catalog **raw** (decompress in `/__ingest`) and let CF auto-compress on
  egress. Don't add `Content-Encoding: gzip` to the GET response.

## When you scaffold a NEW mctl service from this project's experience

The patterns proved out here (Dockerfile shape, CI deploy job, PAT
plumbing) are the canonical mctl onboarding patterns. They're now
documented at https://docs.mctl.ai/guides/scaffolding with copy-paste
templates for Node / Python / Go / static. The `mctl_deploy_service` and
`mctl_grant_repo_access` MCP tool descriptions point at the same URL,
so a fresh Claude session reading the tools should already know the
procedure.

## Cloudflare Worker (catalog edge)

Optional layer that fronts the catalog from R2 — see [`worker/README.md`](worker/README.md).

One-time setup:
```bash
cd worker && npm install
npx wrangler r2 bucket create pelican-catalog       # creates the R2 bucket
npx wrangler secret put INGEST_SECRET                # set to a random hex string
npx wrangler deploy                                  # prints the worker URL
```

Then on the proxy side (in `.env` or k8s secret_env_vars):
```
CATALOG_INGEST_URL=https://pelican-catalog-worker.<account>.workers.dev/__ingest
CATALOG_INGEST_SECRET=<same as Worker INGEST_SECRET>
```

When unset on the proxy, the upload step is silently skipped (forks without
Cloudflare still work). When set, every successful `buildFull()` POSTs the
gzipped catalog to the Worker, which decompresses, stores raw JSON to R2,
and serves it from the edge with 1h cache.

In the Vue widget, pass `catalog-base="<worker-url>"` alongside `api-base`
to fetch the catalog from the edge while live data still goes through the
proxy.

## External resources

- Source: https://github.com/mashkoffdmitry/pelican-libertex-social
- npm: https://www.npmjs.com/package/@mashkovd/pelican-vue
- mctl docs (scaffolding): https://docs.mctl.ai/guides/scaffolding
- ArgoCD UI for this app: https://ops.mctl.ai/applications/argocd/labs-pelican-proxy
