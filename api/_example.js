// Boilerplate API handler. After `npm run new`, rename `example` to match this file's basename.
/** GET /api/example?shop=… */

export default async function example(req, res, { shop }) {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ ok: true, shop, message: 'Replace this with your handler logic.' }));
}
