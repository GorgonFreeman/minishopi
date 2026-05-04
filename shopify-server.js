import '@shopify/shopify-api/adapters/node';
import { shopifyApi, ApiVersion } from '@shopify/shopify-api';

/** Prefer HOSTED_URL on hosted env so .env can keep tunnel HOST for local dev. */
const publicOrigin = (process.env.HOSTED_URL || process.env.HOST || '')
  .trim()
  .replace(/\/+$/u, '');
const hostName = publicOrigin.replace(/^https?:\/\//u, '');

const scopes = (process.env.SCOPES ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes,
  hostName,
  apiVersion: ApiVersion.April26,
  isEmbeddedApp: true,
});
