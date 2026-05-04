# Google Cloud (Cloud Run)

You only need: **build the app → run `node server.js` in a container → set the same env vars as `.env` → point Shopify at the service URL.**

## One way to ship it

From the repo root, set **`GCP_PROJECT`** (and optionally **`GCP_REGION`**, **`GCP_SERVICE`**, etc.) in **`.env`**, then:

```bash
npm run deploy
```

This runs **`scripts/gcp-deploy.mjs`**, which:

1. Resolves a public **`HOST` / `HOSTED_URL`** *before* **`gcloud run deploy`**: **`GCP_PUBLIC_APP_URL`** if set, else the current service URL, else the default **`https://SERVICE-PROJECT_NUMBER.REGION.run.app`**, so **`@shopify/shopify-api`** always has **`hostName`** on first boot (tunnel **`HOST`** in **`.env`** is never sent). Then **`gcloud run deploy`** with **`--set-env-vars`** from **`.env`** (comma-safe escaping like **`bedrock`**’s **`setEnvVarsGcloud`**), plus that public host pair. **`PORT`** and deploy-only **`GCP_*`** keys from **`.env`** are omitted.
2. **`gcloud run services update --update-env-vars`** reapplies **`HOST`** / **`HOSTED_URL`** using **`GCP_PUBLIC_APP_URL`** or the URL from **`gcloud run services describe`**.
3. Writes **`HOSTED_URL`** (the **`*.run.app`** URL) into **`.env`** for your reference.
4. Generates **`shopify.app.live.toml`** (gitignored) and runs **`shopify app deploy -c live --allow-updates`** so **Partners** (App URL + redirects) matches Cloud Run. Requires Shopify CLI login when you run **`npm run deploy`**.

Equivalent one-liner without npm:

```bash
gcloud run deploy kitsuchan --source . --region us-central1 --allow-unauthenticated
```

### Shopify URLs and `example.com`

If the embedded app shows **Example Domain**, **Partners** may still show **`https://example.com`**. Run **`npm run deploy`** again after Cloud Run is healthy so the script regenerates **`shopify.app.live.toml`** and pushes config with **`shopify app deploy`**. You can also run **`npm run shopify:deploy:live`** by itself.

### Local vs production

**`HOST`** in **`.env`** can stay on your **tunnel** for **`npm run dev`**. **`shopify.app.toml`** stays tuned for local/CLI dev; production URLs are written to **`shopify.app.live.toml`** and released by **`npm run deploy`** (Shopify CLI at the end).

**`GET /health`** returns **`200`** / **`ok`** for probes.

---

More detail (Artifact Registry, Secret Manager, CI) lives in Google’s **[Cloud Run docs](https://cloud.google.com/run/docs)** — only pull that in when you outgrow a single deploy command.
