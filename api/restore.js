'use strict';
const { begin, readJsonBody, normalizeEmail, stripeApi, purchasedProduct, signLicense } = require('./_lib');

const NOT_FOUND = "We couldn't find a purchase for that email. Please use the email address from your receipt.";

/**
 * POST { email } -> { keys: [{ product, key, date }] }
 * Looks up completed Checkout Sessions for that email and re-issues keys for the paid Poetic Signal ones.
 */
module.exports = async function handler(req, res) {
  const config = begin(req, res);
  if (!config) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = readJsonBody(req);
  const normalized = normalizeEmail(email);
  if (!normalized) return res.status(400).json({ error: 'Please enter a valid email address.' });

  const typed = String(email).trim();
  const found = new Map();
  for (const candidate of Array.from(new Set([typed, normalized]))) {
    const r = await stripeApi(config.stripeKey, 'GET', '/v1/checkout/sessions', {
      customer_details: { email: candidate },
      status: 'complete',
      limit: 100,
    });
    if (!r.ok) return res.status(502).json({ error: 'Could not reach the store. Please try again in a minute.' });
    for (const s of Array.isArray(r.json?.data) ? r.json.data : []) {
      const product = purchasedProduct(s);
      if (product && !found.has(s.id)) found.set(s.id, { s, product });
    }
  }
  if (found.size === 0) return res.status(404).json({ error: NOT_FOUND });

  const now = Math.floor(Date.now() / 1000);
  const keys = [];
  const ordered = [...found.values()].sort((a, b) => (b.s.created ?? 0) - (a.s.created ?? 0));
  for (const { s, product } of ordered) {
    keys.push({
      product,
      key: await signLicense(config.signingKey, { product, session: s.id, issuedAt: now }),
      date: typeof s.created === 'number' ? new Date(s.created * 1000).toISOString().slice(0, 10) : null,
    });
  }
  return res.status(200).json({ keys });
};
