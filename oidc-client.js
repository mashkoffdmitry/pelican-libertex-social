// API-only OIDC client for libertex.copy-trade.io / identity.copy-trade.io.
//
// Replaces the previous puppeteer-core refresher: instead of running a real
// browser to scrape sessionStorage, we walk the OAuth 2.0 authorization_code +
// PKCE flow directly with `fetch` + `tough-cookie`.
//
// Verified against identity.copy-trade.io 2026-05-07:
//   - GET  /connect/authorize?client_id=libertexweb&...&acr_values=tenant:Libertex%20sign_up:true
//          → 302 to /Account/Login?ReturnUrl=%2Fconnect%2Fauthorize%2Fcallback%3F...
//   - GET  /Account/Login?ReturnUrl=...                       (sets antiforgery cookie)
//          → 200 with form: __RequestVerificationToken hidden + Email/Password inputs
//   - POST /Account/Login?ReturnUrl=...                       (form-urlencoded)
//          → 302 → /connect/authorize/callback?... → 302 → redirect_uri?code=...&state=...
//   - POST /connect/token  grant_type=authorization_code&code_verifier=...
//          → { access_token, expires_in, refresh_token (if scope had offline_access), id_token }
//
// Renewal:
//   - If we have a refresh_token: POST /connect/token with grant_type=refresh_token.
//   - Fallback: GET /connect/authorize?prompt=none&id_token_hint=... with the same cookie
//     jar (IdP session cookie keeps us logged in for ~hours/days).

'use strict';

const crypto = require('crypto');
const { CookieJar } = require('tough-cookie');

const AUTHORITY = process.env.LIBERTEX_AUTHORITY || 'https://identity.copy-trade.io';
const REDIRECT_URI =
  process.env.LIBERTEX_REDIRECT_URI ||
  'https://libertex.copy-trade.io/authentication/login-callback';
const CLIENT_ID = process.env.LIBERTEX_CLIENT_ID || 'libertexweb';
const TENANT = process.env.LIBERTEX_TENANT || 'Libertex';
const SCOPE = process.env.LIBERTEX_SCOPE || 'openid profile email copytrade offline_access';
const ACR_VALUES =
  process.env.LIBERTEX_ACR_VALUES || `tenant:${TENANT} sign_up:true`;
const USER_AGENT =
  process.env.LIBERTEX_USER_AGENT ||
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function pkcePair() {
  const verifier = base64Url(crypto.randomBytes(32));
  const challenge = base64Url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

function randomState() {
  return crypto.randomBytes(16).toString('hex');
}

function base64Url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function buildAuthorizeUrl({ challenge, state, prompt, idTokenHint }) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPE,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    acr_values: ACR_VALUES,
    response_mode: 'query',
  });
  if (prompt) params.set('prompt', prompt);
  if (idTokenHint) params.set('id_token_hint', idTokenHint);
  return `${AUTHORITY}/connect/authorize?${params.toString()}`;
}

// fetch wrapper that applies cookies from `jar` and stores Set-Cookie back into it.
// Always uses redirect:'manual' so the caller decides when to stop following.
async function jarFetch(jar, url, options = {}) {
  const cookieHeader = await jar.getCookieString(url);
  const headers = new Headers(options.headers || {});
  if (cookieHeader) headers.set('cookie', cookieHeader);
  if (!headers.has('user-agent')) headers.set('user-agent', USER_AGENT);
  if (!headers.has('accept')) {
    headers.set('accept', 'text/html,application/xhtml+xml,application/xml;q=0.9');
  }
  if (!headers.has('accept-language')) headers.set('accept-language', 'en-US,en;q=0.5');

  const res = await fetch(url, { ...options, headers, redirect: 'manual' });

  const setCookie =
    typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie()
      : res.headers.raw?.()['set-cookie'] || [];
  for (const c of setCookie) {
    try {
      await jar.setCookie(c, url);
    } catch {
      /* invalid cookie — skip */
    }
  }
  return res;
}

// Walks 3xx Location chain. Stops on:
//   - non-redirect status (returns the final response)
//   - URL whose host equals `stopHost` (returns response without fetching it; caller reads Location)
async function followRedirects(jar, startUrl, options, { maxHops = 10, stopHost = null } = {}) {
  let url = startUrl;
  let res;
  for (let i = 0; i < maxHops; i++) {
    res = await jarFetch(jar, url, options);
    if (res.status >= 300 && res.status < 400) {
      let loc = res.headers.get('location');
      if (!loc) return { res, url };
      // identity.copy-trade.io occasionally returns HTML-entity-encoded
      // ampersands in Location headers (e.g. ?a=1&amp;b=2). Browsers tolerate
      // this; URL() treats `&amp;` as part of the previous parameter's value,
      // which breaks the next /connect/authorize/callback hop and the IdP
      // bounces with `invalid_request`. Normalise before parsing.
      loc = loc.replace(/&amp;/g, '&');
      const next = new URL(loc, url);
      if (stopHost && next.host === stopHost) {
        return { res, url, finalLocation: next.toString() };
      }
      url = next.toString();
      // After the first hop, drop the request body — only the initial POST
      // carries form data; redirects are GETs.
      options = { ...options, method: 'GET', body: undefined };
      continue;
    }
    return { res, url };
  }
  throw new Error(`too many redirects following ${startUrl}`);
}

// Extracts the value of the first hidden form field with the given `name`.
// We use a simple regex here — Identity's login HTML is well-formed and the
// bundle weight of htmlparser2 (or jsdom) isn't worth it for two field reads.
function extractHidden(html, name) {
  const re = new RegExp(
    `<input[^>]*name="${name}"[^>]*value="([^"]*)"|<input[^>]*value="([^"]*)"[^>]*name="${name}"`,
    'i',
  );
  const m = html.match(re);
  return m ? (m[1] ?? m[2]) : null;
}

async function loginAndGetToken({ email, password, jar = new CookieJar() }) {
  if (!email || !password) {
    throw makeError('config', 'LIBERTEX_EMAIL and LIBERTEX_PASSWORD are required');
  }
  const { verifier, challenge } = pkcePair();
  const state = randomState();
  const authorizeUrl = buildAuthorizeUrl({ challenge, state });

  // 1) authorize → 302 → /Account/Login?ReturnUrl=...
  // 2) GET /Account/Login → 200 form HTML + antiforgery cookie
  const callbackHost = new URL(REDIRECT_URI).host;
  const authResp = await followRedirects(jar, authorizeUrl, {}, { stopHost: callbackHost });

  // We expect to land on a 200 from the IdP login page. If the chain terminated
  // at the redirect_uri host, the user is already authenticated (rare on first
  // run but happens if a long-lived idsrv cookie survives a process restart).
  if (authResp.finalLocation) {
    const cb = new URL(authResp.finalLocation);
    assertState(cb, state);
    const code = cb.searchParams.get('code');
    if (!code) throw makeError('login_failed', 'callback URL has no code');
    return await exchangeCodeForToken({ code, verifier });
  }
  if (authResp.res.status !== 200) {
    throw makeError(
      'login_failed',
      `unexpected ${authResp.res.status} fetching login form`,
    );
  }

  const formHtml = await authResp.res.text();
  const verificationToken = extractHidden(formHtml, '__RequestVerificationToken');
  const returnUrl = extractHidden(formHtml, 'ReturnUrl');
  if (!verificationToken || !returnUrl) {
    throw makeError('login_failed', 'login form missing antiforgery token or ReturnUrl');
  }

  // 3) POST /Account/Login (same URL as the 200 we just got)
  const formAction = authResp.url; // /Account/Login?ReturnUrl=...
  const body = new URLSearchParams({
    ReturnUrl: returnUrl,
    Tenant: TENANT,
    HasRegistration: 'True',
    AfDeviceId: '',
    AdId: '',
    OsVersion: '',
    OsPlatform: '',
    Email: email,
    Password: password,
    __RequestVerificationToken: verificationToken,
    button: 'login',
  });

  const submitResp = await followRedirects(
    jar,
    formAction,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9',
        origin: AUTHORITY,
        referer: formAction,
      },
      body: body.toString(),
    },
    { stopHost: callbackHost, maxHops: 6 },
  );

  if (!submitResp.finalLocation) {
    // Likely the IdP rendered the login page again with an error message
    // (bad password, captcha, lockout). 200 from the IdP host on POST is the
    // "form re-displayed" case.
    if (submitResp.res.status === 200) {
      const html = await submitResp.res.text().catch(() => '');
      const err = extractValidationError(html);
      throw makeError('invalid_credentials', err || 'login form re-displayed');
    }
    throw makeError(
      'login_failed',
      `unexpected ${submitResp.res.status} after submitting login form`,
    );
  }

  const callbackUrl = new URL(submitResp.finalLocation);
  assertState(callbackUrl, state);
  const code = callbackUrl.searchParams.get('code');
  if (!code) throw makeError('login_failed', 'redirect_uri has no code parameter');
  return await exchangeCodeForToken({ code, verifier });
}

// OAuth security BCP §4.7: the client MUST verify the state value returned in
// the redirect matches the value sent in the authorize request. Without this
// an attacker can inject a code from a different session.
function assertState(callbackUrl, expected) {
  const got = callbackUrl.searchParams.get('state');
  if (got !== expected) {
    throw makeError('login_failed', `state mismatch: expected ${expected.slice(0, 8)}…, got ${(got || '').slice(0, 8)}…`);
  }
}

async function exchangeCodeForToken({ code, verifier }) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    code_verifier: verifier,
  });
  const r = await fetch(`${AUTHORITY}/connect/token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json',
      'user-agent': USER_AGENT,
    },
    body: body.toString(),
  });
  return await readTokenResponse(r);
}

async function refreshWithToken({ refreshToken }) {
  if (!refreshToken) throw makeError('config', 'refresh_token missing');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: CLIENT_ID,
  });
  const r = await fetch(`${AUTHORITY}/connect/token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json',
      'user-agent': USER_AGENT,
    },
    body: body.toString(),
  });
  return await readTokenResponse(r);
}

async function silentRenew({ jar, idToken }) {
  if (!jar) throw makeError('config', 'silentRenew requires a populated cookie jar');
  const { verifier, challenge } = pkcePair();
  const state = randomState();
  const url = buildAuthorizeUrl({
    challenge,
    state,
    prompt: 'none',
    idTokenHint: idToken,
  });
  const callbackHost = new URL(REDIRECT_URI).host;
  const r = await followRedirects(jar, url, {}, { stopHost: callbackHost, maxHops: 6 });

  if (!r.finalLocation) {
    // 302 to /Account/Login means the IdP session has expired — caller falls
    // back to a full re-login.
    if (r.url && r.url.includes('/Account/Login')) {
      throw makeError('session_expired', 'IdP session expired during silent renew');
    }
    throw makeError('login_failed', `silent renew did not reach callback (${r.res.status})`);
  }
  const cb = new URL(r.finalLocation);
  const error = cb.searchParams.get('error');
  if (error) {
    if (error === 'login_required' || error === 'interaction_required') {
      throw makeError('session_expired', error);
    }
    throw makeError('login_failed', `silent renew error=${error}`);
  }
  assertState(cb, state);
  const code = cb.searchParams.get('code');
  if (!code) throw makeError('login_failed', 'silent renew callback has no code');
  return await exchangeCodeForToken({ code, verifier });
}

async function readTokenResponse(r) {
  const text = await r.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw makeError('login_failed', `non-JSON token response: ${text.slice(0, 120)}`);
  }
  if (!r.ok || json.error) {
    throw makeError(
      json.error === 'invalid_grant' ? 'session_expired' : 'login_failed',
      `${r.status} ${json.error || ''}: ${json.error_description || ''}`.trim(),
    );
  }
  if (!json.access_token) {
    throw makeError('login_failed', 'token response missing access_token');
  }
  const expires_at = Math.floor(Date.now() / 1000) + (parseInt(json.expires_in, 10) || 3600);
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token || null,
    id_token: json.id_token || null,
    expires_at,
  };
}

function extractValidationError(html) {
  const m =
    html.match(/<div[^>]*validation-summary[^>]*>([\s\S]*?)<\/div>/i) ||
    html.match(/<span[^>]*field-validation-error[^>]*>([\s\S]*?)<\/span>/i);
  if (!m) return null;
  return m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() || null;
}

function makeError(code, message) {
  const e = new Error(message);
  e.code = code;
  return e;
}

module.exports = {
  loginAndGetToken,
  silentRenew,
  refreshWithToken,
  CookieJar,
  // exported for tests / debugging
  _internal: { pkcePair, buildAuthorizeUrl, extractHidden },
};
