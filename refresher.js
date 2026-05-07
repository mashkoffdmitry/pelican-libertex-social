// Token refresher — API-only OIDC client (no Chromium / no Puppeteer).
//
// Replaces the previous puppeteer-core implementation. Walks the
// authorization_code+PKCE flow against identity.copy-trade.io directly with
// fetch + tough-cookie (see oidc-client.js for the full request/response
// contract).
//
// Renewal strategy:
//   1. If we have a refresh_token (scope=offline_access was granted), use the
//      refresh_token grant — cheapest, no cookie state required.
//   2. Otherwise, attempt silent renew via /connect/authorize?prompt=none
//      against the cookie jar that survived from the previous login.
//   3. On either failing with session_expired, do a full email/password login.

'use strict';

const path = require('path');
const fs = require('fs');
const { loginAndGetToken, refreshWithToken, silentRenew, CookieJar } = require('./oidc-client');

(function loadEnv() {
  const p = process.env.ENV_PATH || path.join(__dirname, '.env');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
})();

const ENV_PATH = process.env.ENV_PATH || path.join(__dirname, '.env');
const REFRESH_INTERVAL_MS = parseInt(process.env.REFRESH_MS || (45 * 60 * 1000), 10);
const REFRESH_BEFORE_EXPIRY_S = 600;

// In-memory state. The cookie jar holds the IdP session cookies after the
// initial login, which lets us do silent renew for as long as the jar is
// valid. The pod's filesystem is ephemeral so this state is rebuilt on every
// container restart — that's fine; full login takes ~3-5s.
let jar = new CookieJar();
let lastIdToken = null;

function readEnv() {
  const env = {};
  if (!fs.existsSync(ENV_PATH)) return env;
  for (const line of fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

function writeEnv(env) {
  const txt = Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
  fs.writeFileSync(ENV_PATH, txt);
}

function persist(token) {
  const env = readEnv();
  env.ACCESS_TOKEN = token.access_token;
  env.EXPIRES_AT = String(token.expires_at || '');
  env.SAVED_AT = String(Math.floor(Date.now() / 1000));
  if (token.refresh_token) env.REFRESH_TOKEN = token.refresh_token;
  writeEnv(env);
  if (token.id_token) lastIdToken = token.id_token;
  const left = (token.expires_at || 0) - Math.floor(Date.now() / 1000);
  console.log(`[refresher] token saved, ${left}s left, refresh_token=${token.refresh_token ? 'yes' : 'no'}`);
}

async function fullLogin() {
  const email = process.env.LIBERTEX_EMAIL;
  const password = process.env.LIBERTEX_PASSWORD;
  if (!email || !password) {
    throw new Error('LIBERTEX_EMAIL / LIBERTEX_PASSWORD not set');
  }
  jar = new CookieJar();
  const t = await loginAndGetToken({ email, password, jar });
  persist(t);
  return t;
}

async function refresh() {
  const env = readEnv();
  const refreshToken = env.REFRESH_TOKEN;

  // Path 1: refresh_token grant — fastest, doesn't touch cookies/login form
  if (refreshToken) {
    try {
      const t = await refreshWithToken({ refreshToken });
      persist(t);
      return t;
    } catch (e) {
      if (e.code !== 'session_expired') {
        console.warn('[refresher] refresh_token grant failed:', e.message);
      }
      // fall through
    }
  }

  // Path 2: silent renew via prompt=none + the live cookie jar
  if (lastIdToken && jar) {
    try {
      const t = await silentRenew({ jar, idToken: lastIdToken });
      persist(t);
      return t;
    } catch (e) {
      if (e.code !== 'session_expired') {
        console.warn('[refresher] silent renew failed:', e.message);
      }
      // fall through
    }
  }

  // Path 3: full re-login
  console.log('[refresher] performing full login');
  return await fullLogin();
}

async function tickIfNeeded() {
  const env = readEnv();
  const now = Math.floor(Date.now() / 1000);
  const exp = parseInt(env.EXPIRES_AT || '0', 10);
  const left = exp - now;
  if (left > REFRESH_BEFORE_EXPIRY_S) return;
  try {
    await refresh();
  } catch (e) {
    console.error('[refresher] refresh failed:', e.message);
  }
}

async function start() {
  try {
    await refresh();
  } catch (e) {
    console.error('[refresher] startup failed:', e.message);
  }
  setInterval(tickIfNeeded, 60_000);
  setInterval(
    () => refresh().catch((e) => console.error('[refresher] periodic fail:', e.message)),
    REFRESH_INTERVAL_MS,
  );
}

if (require.main === module) {
  start();
}

module.exports = { start, refresh };
