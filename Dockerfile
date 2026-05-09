# ---- Stage 1: Build the Vue UMD bundle ----
# Friend's deployment serves a *branded* version of pelican-vue (logo, welcome
# modal, RU translations) baked into the proxy. We build it here so the npm
# package on registry stays the generic, unbranded version. See vue/ for source.
FROM node:22.11-alpine3.20 AS vue-build

WORKDIR /vue

COPY vue/package*.json ./
RUN npm ci

COPY vue/ ./
RUN npm run build
# Output: /vue/dist/style.css and /vue/dist/pelican-libertex-social.umd.cjs


# ---- Stage 2: Final runtime ----
FROM node:22.11-alpine3.20

# tini for proper signal handling of two child processes (server + refresher)
RUN apk add --no-cache tini

ENV ENV_PATH=/tmp/.env
ENV NODE_ENV=production
ENV PORT=8787

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Proxy code + brand assets (logo, favicon, blobs)
COPY server.js refresher.js oidc-client.js r2-uploader.js start.sh \
     bg-blob.png bg-blob2.png logo.png favicon.png ./

# Vue bundle from stage 1 — served statically from /app/dist by server.js
COPY --from=vue-build /vue/dist ./dist

RUN chmod +x start.sh && \
    addgroup -S app && adduser -S -G app -h /home/app app && \
    chown -R app:app /app /tmp

USER app

EXPOSE 8787

# Liveness probe for plain `docker run` / docker-compose. K8s probes
# (configured via mctl) hit /healthz and /readyz directly and don't need this.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:8787/healthz', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["./start.sh"]
