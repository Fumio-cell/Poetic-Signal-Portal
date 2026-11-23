'use strict';
// Shared helpers for the Poetic Signal store functions (LK-2a).
// Files starting with "_" in api/ are not exposed as endpoints by Vercel.
// Node built-ins and fetch only: no runtime dependencies.

const { webcrypto } = require('node:crypto');
const { subtle } = webcrypto;

const APP_TAG = 'poetic-signal';
const PRODUCT_CODES = ['spectraline', 'luma2midi', 'bundle'];
const PRODUCT_NAMES = { spectraline: 'SpectraLine', luma2midi: 'Luma2MIDI', bundle: 'Poetic Signal Bundle' };
const STRIPE_API_VERSION = '2026-04-22.dahlia';
const NOT_READY = 'Purchases are not available yet.';
const KEY_PREFIX = 'PS1.';

// ---------- base64url ----------

const b64urlEncode = (bytes) => Buffer.from(bytes).toString('base64url');

/** Strict decode: only the base64url alphabet, no padding. Returns a Buffer or null. */
const b64urlDecode = (text) => {
  if (typeof text !== 'string' || !/^[A-Za-z0-9_-]*$/.test(text) || text.length % 4 === 1) return null;
  const buf = Buffer.from(text, 'base64url');
  return buf.toString('base64url') === text ? buf : null;
};

// ---------- license keys ----------
// Key text: "PS1." + base64url(payload JSON) + "." + base64url(signature)
// The signature (raw 64-byte r||s, ECDSA P-256 / SHA-256) covers the ASCII bytes of
// "PS1." + base64url(payload JSON), that is, everything in the key before the last dot.

const ECDSA = { name: 'ECDSA', hash: 'SHA-256' };
const CURVE = { name: 'ECDSA', namedCurve: 'P-256' };

const signedText = (payloadPart) => new TextEncoder().encode(KEY_PREFIX + payloadPart);

async function signLicense(privateJwk, { product, session, issuedAt }) {
  const key = await subtle.importKey('jwk', privateJwk, CURVE, false, ['sign']);
  const payload = JSON.stringify({ v: 1, p: product, o: session, t: issuedAt });
  const payloadPart = b64urlEncode(new TextEncoder().encode(payload));
  const sig = await subtle.sign(ECDSA, key, signedText(payloadPart));
  return `${KEY_PREFIX}${payloadPart}.${b64urlEncode(new Uint8Array(sig))}`;
}

/** Returns the payload object when the key is genuine, otherwise null. Never throws. */
async function verifyLicense(publicJwk, text) {
  try {
    if (typeof text !== 'string' || !text.startsWith(KEY_PREFIX)) return null;
    const parts = text.slice(KEY_PREFIX.length).split('.');
    if (parts.length !== 2) return null;
    const [payloadPart, sigPart] = parts;
    const sig = b64urlDecode(sigPart);
    const payloadBytes = b64urlDecode(payloadPart);
    if (!sig || sig.length !== 64 || !payloadBytes) return null;
    const key = await subtle.importKey('jwk', publicJwk, CURVE, false, ['verify']);
    const ok = await subtle.verify(ECDSA, key, sig, signedText(payloadPart));
    if (!ok) return null;
    const payload = JSON.parse(payloadBytes.toString('utf8'));
    return payload && payload.v === 1 ? payload : null;
  } catch {
    return null;
  }
}

// ---------- configuration ----------

/** Reads the three environment variables. Returns null when anything is missing or malformed. */
function loadConfig(env = process.env) {
  const secret = env.STRIPE_SECRET_KEY;
  if (!secret || !env.STRIPE_PRODUCTS || !env.LICENSE_SIGNING_KEY) return null;
  try {
    const products = JSON.parse(env.STRIPE_PRODUCTS);
    for (const code of PRODUCT_CODES) {
      if (typeof products[code] !== 'string' || !products[code].startsWith('prod_')) return null;
    }
    const signingKey = JSON.parse(env.LICENSE_SIGNING_KEY);
    if (signingKey.kty !== 'EC' || signingKey.crv !== 'P-256' || !signingKey.d) return null;
    return { stripeKey: secret, products, signingKey };
  } catch {
    return null;
  }
}

// ---------- Stripe ----------

const toStripeForm = (params, prefix = '') => {
  const out = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (item !== null && typeof item === 'object') out.push(...toStripeForm(item, `${key}[${i}]`));
        else out.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(item))}`);
      });
    } else if (typeof v === 'object') {
      out.push(...toStripeForm(v, key));
    } else {
      out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
    }
  }
  return out;
};

async function stripeApi(secretKey, method, path, params) {
  const form = params ? toStripeForm(params).join('&') : '';
  const url = `https://api.stripe.com${path}${method === 'GET' && form ? `?${form}` : ''}`;
  try {
    const r = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Stripe-Version': STRIPE_API_VERSION,
        ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      },
      body: method === 'POST' ? form : undefined,
    });
    const json = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, json };
  } catch (e) {
    return { ok: false, status: 502, json: { error: { message: 'unreachable' } } };
  }
}

/** A Checkout Session that counts as a purchase of a Poetic Signal product, or null. */
const purchasedProduct = (s) => {
  if (!s || s.status !== 'complete' || s.payment_status !== 'paid') return null;
  if (s.metadata?.app !== APP_TAG) return null;
  const product = s.metadata?.product;
  return PRODUCT_CODES.includes(product) && typeof s.id === 'string' ? product : null;
};

// ---------- request helpers ----------

const readJsonBody = (req) => {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) || {};
    } catch {
      return {};
    }
  }
  return {};
};

const normalizeEmail = (v) => {
  if (typeof v !== 'string') return null;
  const e = v.trim().toLowerCase();
  return e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
};

/** https origin of this deployment (http for localhost). Null for a host that is not a plain host name. */
const appOrigin = (req) => {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  if (!/^[a-z0-9.-]+(:\d{1,5})?$/i.test(host)) return null;
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  return `${local ? 'http' : 'https'}://${host}`;
};

/** Sets no-store, checks configuration (503 when missing). Returns the config or null (response already sent). */
const begin = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const config = loadConfig();
  if (!config) {
    res.status(503).json({ error: NOT_READY });
    return null;
  }
  return config;
};

module.exports = {
  APP_TAG,
  PRODUCT_CODES,
  PRODUCT_NAMES,
  NOT_READY,
  b64urlEncode,
  b64urlDecode,
  signLicense,
  verifyLicense,
  loadConfig,
  toStripeForm,
  stripeApi,
  purchasedProduct,
  readJsonBody,
  normalizeEmail,
  appOrigin,
  begin,
};
