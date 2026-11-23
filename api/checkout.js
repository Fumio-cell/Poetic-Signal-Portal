'use strict';
const { PRODUCT_CODES, APP_TAG, begin, readJsonBody, stripeApi, appOrigin } = require('./_lib');

const priceCache = new Map();

/** The product's default price (cached per warm function instance). */
async function defaultPriceId(key, productId) {
  if (priceCache.has(productId)) return priceCache.get(productId);
  const r = await stripeApi(key, 'GET', `/v1/products/${encodeURIComponent(productId)}`);
  const dp = r.json?.default_price;
  const price = typeof dp === 'string' ? dp : dp?.id;
  if (!r.ok || typeof price !== 'string') return null;
  priceCache.set(productId, price);
  return price;
}

/**
 * POST { product } -> { url }
 * Creates a Stripe Checkout Session with Managed Payments (Stripe is the merchant of record).
 */
module.exports = async function handler(req, res) {
  const config = begin(req, res);
  if (!config) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { product } = readJsonBody(req);
  if (typeof product !== 'string' || !PRODUCT_CODES.includes(product)) {
    return res.status(400).json({ error: 'Unknown product.' });
  }
  const origin = appOrigin(req);
  if (!origin) return res.status(400).json({ error: 'Invalid request.' });

  const price = await defaultPriceId(config.stripeKey, config.products[product]);
  if (!price) return res.status(502).json({ error: 'Could not open the checkout. Please try again.' });

  const r = await stripeApi(config.stripeKey, 'POST', '/v1/checkout/sessions', {
    mode: 'payment',
    line_items: [{ price, quantity: 1 }],
    managed_payments: { enabled: true },
    metadata: { app: APP_TAG, product },
    success_url: `${origin}/thanks.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/`,
  });
  if (!r.ok || typeof r.json?.url !== 'string') {
    return res.status(502).json({ error: 'Could not open the checkout. Please try again.' });
  }
  return res.status(200).json({ url: r.json.url });
};
