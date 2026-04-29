/** Autodiscovered at GET /api/getCustomer — name from the file (no .js in the URL). */

export default async function getCustomer(req, res, { shop, session }) {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(
    JSON.stringify({
      ok: true,
      shop,
      scope: session.scope ?? null,
    }),
  );
}
