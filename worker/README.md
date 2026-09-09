# pelican-catalog-worker

Cloudflare Worker that fronts the `pelican-catalog` R2 bucket. Reads serve the
freshly-built strategies catalog with edge cache; the `/__ingest` endpoint
accepts gzipped-JSON pushes from the pelican-proxy after every rebuild.

## One-time setup

```bash
cd worker
npm install

# 1. Create the R2 bucket (only once per account):
npx wrangler r2 bucket create pelican-catalog

# 2. Set the shared ingest secret (any random string, e.g. `openssl rand -hex 32`).
#    Use the SAME value as CATALOG_INGEST_SECRET on the pelican-proxy side.
npx wrangler secret put INGEST_SECRET

# 3. Deploy:
npx wrangler deploy
```

`wrangler deploy` prints the Worker URL — typically
`https://pelican-catalog-worker.<your-account>.workers.dev`. Use that as
`CATALOG_INGEST_URL` (with `/__ingest` suffix) and as the `catalog-base` prop
in the Vue widget.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/strategies-full` | Serve `strategies-enabled.json` from R2 — a bare `Strategy[]` with `IsEnabled=false` rows dropped, same contract as pelican-proxy's `/api/strategies-full` (1h edge cache). Point `catalog-base` here. |
| GET | `/api/strategies-full?raw=1` | Serve `strategies-full.json` from R2 — the raw `{ at, items }` envelope with **all** rows. Used by pelican-proxy's cold-start seed. |
| GET | `/api/strategies-full/progress` | Serve `progress.json` (`ready: true` once first ingest succeeded; `loaded`/`total` = enabled row count, matching what `/api/strategies-full` returns). |
| POST | `/__ingest` | Validates `X-Ingest-Secret`, stores the (gzipped) body to R2 as `strategies-full.json`, derives `strategies-enabled.json` and `progress.json`. |
| GET | `/healthz` | Plain `ok`. |
| GET | `/` | Service metadata. |

## Local dev

```bash
npx wrangler dev          # local server with bound R2 (uses --remote for real R2)
npx wrangler dev --local  # ephemeral in-memory R2 (good for handler smoke-tests)
```

## Pushing a test catalog manually

```bash
echo '{"at": 1700000000000, "items": [{"Id": 1, "Name": "test"}]}' \
  | gzip \
  | curl -sX POST "$WORKER_URL/__ingest" \
      -H "Content-Type: application/json" \
      -H "Content-Encoding: gzip" \
      -H "X-Ingest-Secret: $INGEST_SECRET" \
      --data-binary @-

curl -s "$WORKER_URL/api/strategies-full" | jq 'length'            # enabled rows only
curl -s "$WORKER_URL/api/strategies-full?raw=1" | jq '.items | length'
# → 1
```

## Custom domain (optional)

After deploying, in Cloudflare dashboard → Workers & Pages → your worker
→ Settings → Triggers → Add Custom Domain. Or uncomment the `routes`
block in `wrangler.toml` and redeploy.
