# Google Cloud (Cloud Run)

You only need: **build the app → run `node server.js` in a container → set the same env vars as `.env` → point Shopify at the service URL.**

## One way to ship it

From the repo root (uses the **`Dockerfile`**):

```bash
gcloud run deploy kitsuchan --source . --region us-central1 --allow-unauthenticated
```

After deploy, open **Cloud Run → your service → Edit & deploy new revision → Variables**. Set **`SHOPIFY_API_KEY`**, **`SHOPIFY_API_SECRET`**, **`SCOPES`** (comma-separated), **`UPSTASH_*`** if you use Redis, and **`HOST`** to the service URL shown at the top (HTTPS origin, **no trailing slash** — same value Partners uses for the app).

First revision: use any placeholder **`HOST`** (e.g. `https://placeholder.invalid`) so the process boots, then set **`HOST`** to the real **`https://….run.app`** URL and redeploy.

In **Shopify Partners**: **App URL** = **`HOST/`**, **Allowed redirection URL** = **`HOST/auth/callback`**.

**`GET /health`** returns **`200`** / **`ok`** for probes.

---

More detail (Artifact Registry, Secret Manager, CI) lives in Google’s **[Cloud Run docs](https://cloud.google.com/run/docs)** — only pull that in when you outgrow a single deploy command.
