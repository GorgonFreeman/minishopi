# Google Cloud (Cloud Run)

You only need: **build the app → run `node server.js` in a container → set the same env vars as `.env` → point Shopify at the service URL.**

## One way to ship it

From the repo root, set **`GCP_PROJECT`** (and optionally **`GCP_REGION`**, **`GCP_SERVICE`**, etc.) in **`.env`**, then:

```bash
npm run deploy
```

This runs **`scripts/gcp-deploy.mjs`**, which:

1. **`gcloud run deploy`** from the **`Dockerfile`**, with **`--set-env-vars`** built from **`.env`** (comma-safe escaping like **`bedrock`**’s **`setEnvVarsGcloud`**). **`PORT`**, **`HOST`**, **`HOSTED_URL`**, and deploy-only **`GCP_*`** keys are **not** copied from `.env` as-is (your tunnel **`HOST`** would break production). Optional **`GCP_PUBLIC_APP_URL`** pre-seeds **`HOST`** on first deploy if you use a custom domain.
2. **`gcloud run services update --update-env-vars`** sets **`HOST`** and **`HOSTED_URL`** on the revision to the public URL (**`GCP_PUBLIC_APP_URL`** if set, otherwise the **`*.run.app`** URL from **`gcloud run services describe`**). That matches what Shopify should load in the admin iframe and what **`@shopify/shopify-api`** expects for OAuth.
3. Writes **`HOSTED_URL`** (the **`*.run.app`** URL) into **`.env`** for your reference.
4. Generates **`shopify.app.live.toml`** from **`shopify.app.toml`** with **`application_url`** and **`redirect_urls`** pointing at that public URL (file is gitignored). You can **`shopify app deploy -c live`** so **Partners** stays in sync (fixes **`example.com`** / wrong iframe URLs).
5. If **`SHOPIFY_APP_DEPLOY=1`** in **`.env`**, runs **`npx @shopify/cli app deploy -c live --allow-updates`** after step 4 (requires Shopify CLI login).

Equivalent one-liner without npm:

```bash
gcloud run deploy kitsuchan --source . --region us-central1 --allow-unauthenticated
```

### Shopify URLs and `example.com`

If the embedded app shows **Example Domain**, **Partners → App URL** is still **`https://example.com/`** or otherwise wrong. Run **`npm run deploy`** with **`SHOPIFY_APP_DEPLOY=1`**, or after deploy run:

```bash
npx @shopify/cli app deploy -c live --allow-updates
```

so Shopify picks up **`shopify.app.live.toml`**.

### Local vs production

**`HOST`** in **`.env`** can stay on your **tunnel** for **`npm run dev`**. **`shopify.app.toml`** stays tuned for local/CLI dev; production URLs live in generated **`shopify.app.live.toml`** + **`shopify app deploy -c live`**.

**`GET /health`** returns **`200`** / **`ok`** for probes.

---

More detail (Artifact Registry, Secret Manager, CI) lives in Google’s **[Cloud Run docs](https://cloud.google.com/run/docs)** — only pull that in when you outgrow a single deploy command.
