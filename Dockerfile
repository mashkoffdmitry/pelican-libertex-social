FROM node:22.11-alpine3.20

# tini for proper signal handling of two child processes (server + refresher)
RUN apk add --no-cache tini

ENV ENV_PATH=/tmp/.env
ENV NODE_ENV=production
ENV PORT=8787

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server.js refresher.js oidc-client.js r2-uploader.js start.sh bg-blob.png bg-blob2.png ./

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
