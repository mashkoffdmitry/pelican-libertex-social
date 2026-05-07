FROM node:22-alpine

# tini for proper signal handling of two child processes (server + refresher)
RUN apk add --no-cache tini

ENV ENV_PATH=/tmp/.env
ENV NODE_ENV=production
ENV PORT=8787

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server.js refresher.js oidc-client.js start.sh ./
COPY index.html app.js styles.css favicon.png logo.png bg-blob.png bg-blob2.png ./

RUN chmod +x start.sh && \
    addgroup -S app && adduser -S -G app -h /home/app app && \
    chown -R app:app /app /tmp

USER app

EXPOSE 8787

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["./start.sh"]
