/** POST /api/shopMetafieldsSet?shop=…  body: { namespace, key, type, value } — upserts a single shop metafield. */

import { shopify, getShopId } from '../shopify-server.js';

const MUTATION = `#graphql
  mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
        namespace
        key
        type
        value
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

export default async function shopMetafieldsSet(req, res, { shop, session, body }) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
    return;
  }

  const namespace = typeof body?.namespace === 'string' ? body.namespace.trim() : '';
  const key = typeof body?.key === 'string' ? body.key.trim() : '';
  const type = typeof body?.type === 'string' ? body.type.trim() : '';
  const value = body?.value;

  if (!namespace || !key || !type || value == null) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: 'namespace, key, type, value are required' }));
    return;
  }

  try {
    const client = new shopify.clients.Graphql({ session });
    const ownerId = await getShopId(client, shop);
    const { data } = await client.request(MUTATION, {
      variables: {
        metafields: [ { ownerId, namespace, key, type, value: String(value) } ],
      },
    });

    const userErrors = data?.metafieldsSet?.userErrors ?? [];
    if (userErrors.length > 0) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, errors: userErrors }));
      return;
    }

    const metafield = data?.metafieldsSet?.metafields?.[ 0 ] ?? null;
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, metafield }));
  } catch (err) {
    console.error('shopMetafieldsSet', err);
    const gql = err?.response?.body?.errors?.graphQLErrors;
    const status = err?.response?.code ?? 500;
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        ok: false,
        error: err?.message ?? String(err),
        ...(Array.isArray(gql) ? { errors: gql } : {}),
      }),
    );
  }
}
