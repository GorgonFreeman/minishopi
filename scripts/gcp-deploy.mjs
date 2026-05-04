#!/usr/bin/env node
/**
 * Cloud Run deploy from repo root: `npm run deploy` (loads .env via package.json).
 *
 * - Pushes `.env` into the revision (minus PORT, GCP_* deploy keys, HOST, HOSTED_URL — tunnel
 *   HOST must not reach Cloud Run). Then patches HOST + HOSTED_URL to the service URL
 *   (or GCP_PUBLIC_APP_URL for a custom domain).
 * - Writes `shopify.app.live.toml` from `shopify.app.toml` with that public URL for
 *   `shopify app deploy -c live` (Partners iframe + redirect URLs).
 * - Records `HOSTED_URL` in `.env` (actual *.run.app).
 * - Optional: `SHOPIFY_APP_DEPLOY=1` runs `shopify app deploy -c live --allow-updates`.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnvFile } from './parseEnvFile.mjs';
import { formatSetEnvVarsForGcloud } from './setEnvVarsGcloud.mjs';
import { upsertEnvKey } from './upsertEnvFile.mjs';
import { writeShopifyAppLiveToml } from './writeShopifyAppLiveToml.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const project = process.env.GCP_PROJECT?.trim() || process.env.GOOGLE_CLOUD_PROJECT?.trim();
if (!project) {
  console.error('Missing GCP_PROJECT (or GOOGLE_CLOUD_PROJECT) in .env');
  process.exit(1);
}

const region = (process.env.GCP_REGION ?? 'us-central1').trim();
const service = (process.env.GCP_SERVICE ?? readServiceName()).trim();

const allowRaw = (process.env.GCP_ALLOW_UNAUTHENTICATED ?? 'true').trim().toLowerCase();
const allowUnauthenticated = ! [ '0', 'false', 'no' ].includes(allowRaw);

const args = [
  'run',
  'deploy',
  service,
  '--project',
  project,
  '--region',
  region,
  '--source',
  root,
];

if (allowUnauthenticated) args.push('--allow-unauthenticated');

for (const [ envKey, flag, transform ] of [
  [ 'GCP_MEMORY', '--memory', (v) => v.trim() ],
  [ 'GCP_CPU', '--cpu', (v) => v.trim() ],
  [ 'GCP_MIN_INSTANCES', '--min-instances', (v) => v.trim() ],
  [ 'GCP_MAX_INSTANCES', '--max-instances', (v) => v.trim() ],
  [ 'GCP_TIMEOUT', '--timeout', (v) => v.trim() ],
  [ 'GCP_CONCURRENCY', '--concurrency', (v) => v.trim() ],
  [ 'GCP_SERVICE_ACCOUNT', '--service-account', (v) => v.trim() ],
]) {
  const v = process.env[ envKey ];
  if (v?.trim()) {
    args.push(flag, transform(v));
  }
}

const envPath = join(root, '.env');
if (existsSync(envPath)) {
  const parsed = parseEnvFile(readFileSync(envPath, 'utf8'));
  const exclude = deployExcludeKeys();
  const parts = [];
  for (const [ key, val ] of parsed) {
    if (exclude.has(key)) continue;
    if (val === '') continue;
    parts.push(`${ key }=${ val }`);
  }
  const publicFromEnv = process.env.GCP_PUBLIC_APP_URL?.trim().replace(/\/+$/u, '');
  if (publicFromEnv) {
    parts.push(`HOST=${ publicFromEnv }`, `HOSTED_URL=${ publicFromEnv }`);
  }
  if (parts.length > 0) {
    const combined = formatSetEnvVarsForGcloud(parts.join(','));
    args.push('--set-env-vars', combined);
    console.log(
      `Including ${ parts.length } variable(s) from .env (PORT, HOST, HOSTED_URL, and GCP_* deploy keys omitted unless GCP_PUBLIC_APP_URL is set).`,
    );
  } else {
    console.warn('No non-empty keys from .env to pass to Cloud Run (check .env and exclusions).');
  }
} else {
  console.warn('.env not found — deploy proceeds without --set-env-vars from file.');
}

const pretty = `gcloud ${ args.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(' ') }`;
console.log(pretty);

const result = spawnSync('gcloud', args, { stdio: 'inherit', cwd: root });
const status = result.status === null ? 1 : result.status;
if (status !== 0) {
  process.exit(status);
}

const urlProc = spawnSync(
  'gcloud',
  [
    'run',
    'services',
    'describe',
    service,
    '--project',
    project,
    '--region',
    region,
    '--format',
    'value(status.url)',
  ],
  { encoding: 'utf8', cwd: root },
);
const hostedUrlRaw = urlProc.stdout?.trim();
if (!hostedUrlRaw) {
  console.warn('Could not read Cloud Run service URL; skipping HOST patch and Shopify live TOML.');
  process.exit(0);
}

const hostedUrl = hostedUrlRaw.replace(/\/+$/u, '');
const publicAppUrl = (process.env.GCP_PUBLIC_APP_URL?.trim() || hostedUrl).replace(/\/+$/u, '');
const patch = formatSetEnvVarsForGcloud(`HOST=${ publicAppUrl },HOSTED_URL=${ publicAppUrl }`);
const upd = spawnSync(
  'gcloud',
  [
    'run',
    'services',
    'update',
    service,
    '--project',
    project,
    '--region',
    region,
    '--update-env-vars',
    patch,
  ],
  { stdio: 'inherit', cwd: root },
);
if (upd.status !== 0) {
  console.error('gcloud run services update (HOST / HOSTED_URL) failed.');
  process.exit(upd.status === null ? 1 : upd.status);
}
console.log(`Set HOST and HOSTED_URL on Cloud Run to ${ publicAppUrl }.`);

if (existsSync(envPath)) {
  upsertEnvKey(envPath, 'HOSTED_URL', hostedUrl);
  console.log(`Recorded HOSTED_URL in .env (${ hostedUrl }). Local HOST is unchanged for tunnel dev.`);
}

try {
  const livePath = writeShopifyAppLiveToml(root, publicAppUrl);
  console.log(`Wrote ${ livePath } — run: npx @shopify/cli app deploy -c live --allow-updates`);
} catch (err) {
  console.error('writeShopifyAppLiveToml failed:', err.message);
  process.exit(1);
}

if (shopifyAppDeployEnabled()) {
  console.log('Running shopify app deploy -c live (SHOPIFY_APP_DEPLOY=1)…');
  const s = spawnSync(
    'npx',
    [
      '--yes',
      '@shopify/cli@latest',
      'app',
      'deploy',
      '-c',
      'live',
      '--allow-updates',
    ],
    { stdio: 'inherit', cwd: root, shell: false },
  );
  if (s.status !== 0) {
    console.error('shopify app deploy failed — fix auth or run it manually; Cloud Run is already updated.');
    process.exit(s.status === null ? 1 : s.status);
  }
} else {
  console.log('Tip: set SHOPIFY_APP_DEPLOY=1 in .env to push URLs to Shopify after each Cloud Run deploy.');
}

process.exit(0);

function shopifyAppDeployEnabled() {
  const v = (process.env.SHOPIFY_APP_DEPLOY ?? '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function readServiceName() {
  try {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    if (typeof pkg.name === 'string' && pkg.name.length > 0) return pkg.name;
  } catch {
    /* use fallback */
  }
  return 'kitsuchan';
}

function deployExcludeKeys() {
  const s = new Set([
    'PORT',
    'HOST',
    'HOSTED_URL',
    'GCP_PROJECT',
    'GCP_REGION',
    'GCP_SERVICE',
    'GCP_ALLOW_UNAUTHENTICATED',
    'GCP_MEMORY',
    'GCP_CPU',
    'GCP_MIN_INSTANCES',
    'GCP_MAX_INSTANCES',
    'GCP_TIMEOUT',
    'GCP_CONCURRENCY',
    'GCP_SERVICE_ACCOUNT',
    'GCP_RUN_ENV_KEYS',
    'GCP_DEPLOY_ENV_EXCLUDE',
    'GCP_PUBLIC_APP_URL',
    'SHOPIFY_APP_DEPLOY',
  ]);
  for (const k of (process.env.GCP_DEPLOY_ENV_EXCLUDE ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)) {
    s.add(k);
  }
  return s;
}
