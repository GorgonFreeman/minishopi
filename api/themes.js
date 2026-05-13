/** GET /api/themes?shop=… */

import { shopify } from '../shopify-server.js';

const QUERY = `#graphql
  query ThemesList($first: Int!) {
    themes(first: $first) {
      nodes {
        id
        name
        role
      }
    }
  }
`;

export default async function themes(req, res, { session }) {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
    return;
  }

  try {
    const client = new shopify.clients.Graphql({ session });
    const { data } = await client.request(QUERY, { variables: { first: 50 } });
    const nodes = data?.themes?.nodes ?? [];
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, themes: nodes }));
  } catch (err) {
    console.error('themes', err);
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
