#!/usr/bin/env node
/**
 * Cloud Run deploy from repo root: `npm run deploy` (loads .env via package.json).
 * Required: GCP_PROJECT. Optional: GCP_REGION, GCP_SERVICE, scaling, and GCP_RUN_ENV_KEYS.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

const envKeys = (process.env.GCP_RUN_ENV_KEYS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

if (envKeys.length > 0) {
  const pairs = [];
  for (const key of envKeys) {
    const val = process.env[ key ];
    if (val === undefined) continue;
    pairs.push(encodeEnvVarForGcloud(key, val));
  }
  if (pairs.length > 0) args.push('--set-env-vars', pairs.join(','));
}

const pretty = `gcloud ${ args.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(' ') }`;
console.log(pretty);

const result = spawnSync('gcloud', args, { stdio: 'inherit', cwd: root });
process.exit(result.status === null ? 1 : result.status);

function readServiceName() {
  try {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    if (typeof pkg.name === 'string' && pkg.name.length > 0) return pkg.name;
  } catch {
    /* use fallback */
  }
  return 'kitsuchan';
}

/** KEY=VALUE for gcloud --set-env-vars (commas in value → \, ). */
function encodeEnvVarForGcloud(key, value) {
  const enc = String(value).replace(/\\/g, '\\\\').replace(/,/g, '\\,');
  return `${ key }=${ enc }`;
}
