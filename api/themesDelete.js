/** POST /api/themesDelete?shop=…  body: { ids: string[] } — theme GIDs */

import { shopify } from '../shopify-server.js';

const MUTATION = `#graphql
  mutation ThemeDeleteOne($id: ID!) {
    themeDelete(id: $id) {
      deletedThemeId
      userErrors {
        field
        message
      }
    }
  }
`;

export default async function themesDelete(req, res, { session, body }) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
    return;
  }

  const ids = body?.ids;
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === 'string')) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: 'ids must be a non-empty string array' }));
    return;
  }

  try {
    const client = new shopify.clients.Graphql({ session });
    const results = [];
    for (const id of ids) {
      const { data } = await client.request(MUTATION, { variables: { id } });
      const userErrors = data?.themeDelete?.userErrors ?? [];
      results.push({ id, userErrors });
    }
    const ok = results.every((r) => r.userErrors.length === 0);
    res.writeHead(ok ? 200 : 400, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok, results }));
  } catch (err) {
    console.error('themesDelete', err);
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
