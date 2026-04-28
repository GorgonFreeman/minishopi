# minishopi

The most minimal Node Shopify embedded app I could manage. Single file (`server.js`), `@shopify/shopify-api` plus `@upstash/redis` for sessions, no Express.

## Requirements

- Node 22+
- A public HTTPS URL pointing at your local machine (provided via `npm run tunnel`, which uses Cloudflare's `cloudflared`)
- A Shopify Partner account + a development store
- An [Upstash](https://upstash.com/) Redis database (free tier is fine) — copy **REST URL** and **REST TOKEN** into `.env`

## Setup

1. **Install deps**

   ```bash
   npm install
   ```

2. **Start a tunnel** so Shopify can reach your local server:

   ```bash
   npm run tunnel
   ```

   Copy the HTTPS URL it prints (e.g. `https://something.trycloudflare.com`).

3. **Create the app in Shopify Partners**
   - Go to https://partners.shopify.com → Apps → Create app → Create app manually
   - **App URL**: `https://<your-tunnel>/`
   - **Allowed redirection URL**: `https://<your-tunnel>/auth/callback`
   - Copy the **Client ID** and **Client secret**

4. **Configure env**

   ```bash
   cp .env.example .env
   ```

   Fill in `SHOPIFY_API_KEY` (Client ID), `SHOPIFY_API_SECRET` (Client secret), `HOST` (your tunnel URL), and `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` from the Upstash console. `SCOPES` is pre-populated with a wide set; trim if you like.

5. **Run**

   ```bash
   npm start
   ```

6. **Install on your dev store** from the Partners app page → *Test your app* → pick the dev store. You should land on a page that says `It's minishopi c:`.

## Notes

- Offline OAuth sessions are stored in Upstash under keys `minishopi:session:<shop>` — survives server restarts; revoke access by deleting keys or uninstalling the app from the store.
- **Embedded iframe**: Shopify loads your app in an iframe first. OAuth cookies from `@shopify/shopify-api` use `SameSite=Lax`, which browsers often block in that cross-site iframe. Before starting OAuth we detect `Sec-Fetch-Dest: iframe` and redirect the **top window** to the same URL so `auth.begin` runs in a first-party tab and the cookie survives through the Shopify redirect back to `/auth/callback`.
- All routes are inline in `server.js`: `/auth/callback` for OAuth, everything else expects `?shop=` and either kicks off OAuth or serves the homepage.
