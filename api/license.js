'use strict';
const { begin, stripeApi, purchasedProduct, signLicense } = require('./_lib');

const NOT_FOUND = "We couldn't find a completed purchase for this link.";

/**
 * GET ?session_id=cs_... -> { key, product }
 * Issues a license key only for a completed, paid Poetic Signal Checkout Session.
 */
module.exports = async function handler(req, res) {
  const config = begin(req, res);
  if (!config) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  let sessionId = req.query?.session_id;
  if (sessionId === undefined) {
    try {
      sessionId = new URL(req.url, 'http://localhost').searchParams.get('session_id');
    } catch {
      sessionId = null;
    }
  }
  if (typeof sessionId !== 'string' || !/^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(sessionId)) {
    return res.status(404).json({ error: NOT_FOUND });
  }

  const r = await stripeApi(config.stripeKey, 'GET', `/v1/checkout/sessions/${encodeURIComponent(sessionId)}`);
  if (r.status === 404 || r.status === 400) return res.status(404).json({ error: NOT_FOUND });
  if (!r.ok) return res.status(502).json({ error: 'Could not reach the store. Please try again in a minute.' });

  const product = purchasedProduct(r.json);
  if (!product || r.json.id !== sessionId) return res.status(404).json({ error: NOT_FOUND });

  const key = await signLicense(config.signingKey, {
    product,
    session: r.json.id,
    issuedAt: Math.floor(Date.now() / 1000),
  });
  return res.status(200).json({ key, product });
};
