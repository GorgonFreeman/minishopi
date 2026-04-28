import '@shopify/shopify-api/adapters/node';
import { shopifyApi, ApiVersion, Session } from '@shopify/shopify-api';
import { Redis } from '@upstash/redis';
import { createServer } from 'node:http';

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: process.env.SCOPES.split(','),
  hostName: process.env.HOST.replace(/^https?:\/\//, ''),
  apiVersion: ApiVersion.April26,
  isEmbeddedApp: true,
});

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

function sessionFromStored(stored) {
  if (stored == null) return undefined;
  const o = typeof stored === 'string' ? JSON.parse(stored) : stored;
  if (o.expires) o.expires = new Date(o.expires);
  if (o.refreshTokenExpires) o.refreshTokenExpires = new Date(o.refreshTokenExpires);
  return new Session(o);
}

async function loadSession(shop) {
  const raw = await redis.get(`minishopi:session:${ shop }`);
  return sessionFromStored(raw);
}

async function saveSession(session) {
  await redis.set(`minishopi:session:${ session.shop }`, JSON.stringify(session.toObject()));
}

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset='utf-8'>
  <meta name='shopify-api-key' content='${ process.env.SHOPIFY_API_KEY }'>
  <script src='https://cdn.shopify.com/shopifycloud/app-bridge.js'></script>
  <title>minishopi</title>
</head>
<body>It's minishopi c:</body>
</html>`;

createServer(async (req, res) => {
  const url = new URL(req.url, `https://${ req.headers.host }`);
  const shop = url.searchParams.get('shop');

  if (url.pathname === '/auth/callback') {
    const { session } = await shopify.auth.callback({ rawRequest: req, rawResponse: res });
    await saveSession(session);
    res.writeHead(302, { Location: `/?shop=${ session.shop }&host=${ url.searchParams.get('host') }` });
    res.end();
    return;
  }

  if (!shop) { res.writeHead(400); res.end('Missing shop'); return; }

  const existing = await loadSession(shop);
  if (!existing?.accessToken) {
    if (req.headers['sec-fetch-dest'] === 'iframe') {
      const absolute = new URL(req.url, `https://${ req.headers.host }`);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<!DOCTYPE html><script>window.top.location.href=${ JSON.stringify(absolute.href) }</script>`);
      return;
    }
    await shopify.auth.begin({ shop, callbackPath: '/auth/callback', isOnline: false, rawRequest: req, rawResponse: res });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/html',
    'Content-Security-Policy': `frame-ancestors https://${ shop } https://admin.shopify.com`,
  });
  res.end(html);
}).listen(process.env.PORT);
