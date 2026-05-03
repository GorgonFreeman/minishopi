import '@shopify/shopify-api/adapters/node';
import { shopifyApi, ApiVersion } from '@shopify/shopify-api';

const hostName = (process.env.HOST ?? '').replace(/^https?:\/\//, '');

export const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: process.env.SCOPES.split(',').map((s) => s.trim()).filter(Boolean),
  hostName,
  apiVersion: ApiVersion.April26,
  isEmbeddedApp: true,
});
