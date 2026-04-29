# minishopi

Small Shopify embedded app: **`server.js`** handles OAuth and serves the built UI; **`src/`** is a React app bundled with **Vite** (Polaris components need React — Vite keeps the config small and readable compared with hand-rolled Rollup or Webpack).

## Requirements

- Node 22+
- A public HTTPS URL pointing at your local machine (provided via `npm run tunnel`, which uses Cloudflare's `cloudflared`)
- A Shopify Partner account + a development store
- Optionally an [Upstash](https://upstash.com/) Redis database — copy **REST URL** and **REST TOKEN** into `.env`. If either is missing, sessions stay **in-memory only** (lost on restart).

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

   Fill in `SHOPIFY_API_KEY` (Client ID), `SHOPIFY_API_SECRET` (Client secret), and `HOST` (your tunnel URL). Add `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` from the Upstash console if you want Redis-backed sessions; omit them to use in-memory storage only. `SCOPES` is pre-populated with a wide set; trim if you like.

5. **Build the Polaris UI** (generates `dist/` — required before `npm start`)

   ```bash
   npm run build
   ```

6. **Run the server**

   Use either a one-off build + server, or the watch workflow:

   ```bash
   npm run build
   npm start
   ```

   Or while editing the UI:

   ```bash
   npm run dev
   ```

7. **Install on your dev store** from the Partners app page → *Test your app* → pick the dev store. You should land on **`/pages/home`** (redirect from `/`) with nav links from **`pages/`** autodiscovery.

## Frontend (Polaris + Vite)

- Root **`index.html`** is the Vite entry; **`src/`** holds **`main.jsx`** (browser **`BrowserRouter`**), **`App.jsx`** (Polaris **`AppProvider`**, **`Routes`**), and route discovery via **`import.meta.glob('../pages/**/*.jsx')`** → paths **`/pages/<slug>`** where `<slug>` matches **`pages/<slug>.jsx`** at repo root.
- Add a Polaris screen by adding **`pages/foo.jsx`** (default export); rebuild (`npm run build` or watch). Nested paths like **`pages/reports/sales.jsx`** become **`/pages/reports/sales`**.
- **`server.js`** serves **`dist/index.html`** for authenticated GETs (any path used by the SPA, not only `/`), **`/assets/*`**, autoloaded **`/api/<handler>`** from **`api/<handler>.js`**, plus **`/auth/callback`**.
- **Development**: run **`npm run dev`** — production build once, then **`vite build --watch`** plus **`npm start`**. Refresh after rebuild when **`src/`**, **`pages/`**, or **`index.html`** change (Ctrl+C stops both).
- **Production-style run**: **`npm run build`** then **`npm start`**.

## API handlers (`api/`)

- One file **`api/getCustomer.js`** → **`GET /api/getCustomer?shop=…`** (no **`.js`** in the URL).
- Export **`export default async function (req, res, { shop, session }) { … }`**. Requests must include **`shop`**; the handler runs only if an offline session exists (same rule as HTML).
- **Handlers load once at process start** — add or rename a file under **`api/`** and restart **`server.js`** (e.g. stop and re-run **`npm run dev`** or **`npm start`**).

## Hosting on Google Cloud

Short checklist: **[docs/hosting-google-cloud.md](docs/hosting-google-cloud.md)** (`gcloud run deploy --source .`, env vars, Shopify URLs). **`GET /health`** for probes.

## Notes

- Offline OAuth sessions: **Upstash** under `minishopi:session:<shop>` when both Upstash env vars are set; otherwise a **process-local `Map`** (same behavior as before Redis — wiped on restart).
- **Embedded iframe**: Shopify loads your app in an iframe first. OAuth cookies from `@shopify/shopify-api` use `SameSite=Lax`, which browsers often block in that cross-site iframe. Before starting OAuth we detect `Sec-Fetch-Dest: iframe` and redirect the **top window** to the same URL so `auth.begin` runs in a first-party tab and the cookie survives through the Shopify redirect back to `/auth/callback`.
- All HTTP routes live in **`server.js`**: **`/assets/*`**, **`/api/*`**, **`/auth/callback`**, **`/health`**, and authenticated SPA **`GET`**s ( **`?shop=`** required except **`/health`**).
