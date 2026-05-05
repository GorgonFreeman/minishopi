/** POST /api/shopMetafieldsDelete?shop=…  body: { namespace, key } — deletes a single shop metafield. */

import { shopify, getShopId } from '../shopify-server.js';

const MUTATION = `#graphql
  mutation MetafieldsDelete($metafields: [MetafieldIdentifierInput!]!) {
    metafieldsDelete(metafields: $metafields) {
      deletedMetafields {
        ownerId
        namespace
        key
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export default async function shopMetafieldsDelete(req, res, { shop, session, body }) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
    return;
  }

  const namespace = typeof body?.namespace === 'string' ? body.namespace.trim() : '';
  const key = typeof body?.key === 'string' ? body.key.trim() : '';

  if (!namespace || !key) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: 'namespace and key are required' }));
    return;
  }

  try {
    const client = new shopify.clients.Graphql({ session });
    const ownerId = await getShopId(client, shop);
    const { data } = await client.request(MUTATION, {
      variables: {
        metafields: [ { ownerId, namespace, key } ],
      },
    });

    const userErrors = data?.metafieldsDelete?.userErrors ?? [];
    if (userErrors.length > 0) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, errors: userErrors }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    console.error('shopMetafieldsDelete', err);
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
