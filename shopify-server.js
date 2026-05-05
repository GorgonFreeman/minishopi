import '@shopify/shopify-api/adapters/node';
import { shopifyApi, ApiVersion } from '@shopify/shopify-api';

const hostName = (process.env.HOST ?? '').trim().replace(/\/+$/u, '').replace(/^https?:\/\//u, '');

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

const shopIdCache = new Map();

/** Resolve the shop's GraphQL gid (e.g. `gid://shopify/Shop/123`), cached per shop domain. */
export async function getShopId(client, shop) {
  const cached = shopIdCache.get(shop);
  if (cached) return cached;
  const { data } = await client.request('{ shop { id } }');
  const id = data?.shop?.id;
  if (!id) throw new Error('Could not resolve shop id');
  shopIdCache.set(shop, id);
  return id;
}
