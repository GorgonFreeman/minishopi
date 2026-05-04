# Google Cloud (Cloud Run)

You only need: **build the app → run `node server.js` in a container → set the same env vars as `.env` → point Shopify at the service URL.**

## One way to ship it

From the repo root, set **`GCP_PROJECT`** (and optionally **`GCP_REGION`**, **`GCP_SERVICE`**, etc.) in **`.env`**, then:

```bash
npm run deploy
```

This runs **`gcloud run deploy`** with **`--source .`** (uses the **`Dockerfile`**). **`scripts/gcp-deploy.mjs`** reads **`.env`** and passes every key to the revision except **`PORT`** (local dev; the container uses **8080**) and deploy-only **`GCP_*`** settings. Comma-heavy values (e.g. **`SCOPES`**) use the same gcloud escaping pattern as **`bedrock`**’s **`_deploy_scripts/setEnvVarsGcloud.js`**. Optional **`GCP_DEPLOY_ENV_EXCLUDE`** lists extra keys to skip.

Equivalent one-liner without npm:

```bash
gcloud run deploy kitsuchan --source . --region us-central1 --allow-unauthenticated
```

If you add new secrets after first deploy, put them in **`.env`** and run **`npm run deploy`** again, or edit **Variables** in the console. **`HOST`** in **`.env`** should match the public HTTPS origin (**no trailing slash**) — update it to your **`*.run.app`** (or custom domain) URL and redeploy so OAuth matches Partners.

First revision: use any placeholder **`HOST`** (e.g. `https://placeholder.invalid`) so the process boots, then set **`HOST`** to the real **`https://….run.app`** URL and redeploy.

In **Shopify Partners**: **App URL** = **`HOST/`**, **Allowed redirection URL** = **`HOST/auth/callback`**.

**`GET /health`** returns **`200`** / **`ok`** for probes.

---

More detail (Artifact Registry, Secret Manager, CI) lives in Google’s **[Cloud Run docs](https://cloud.google.com/run/docs)** — only pull that in when you outgrow a single deploy command.
