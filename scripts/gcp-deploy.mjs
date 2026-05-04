#!/usr/bin/env node
/**
 * Cloud Run deploy from repo root: `npm run deploy` (loads .env via package.json).
 * Required: GCP_PROJECT. Optional: GCP_REGION, GCP_SERVICE, scaling.
 * All keys from `.env` are passed to the revision via `--set-env-vars`, except deploy-only
 * `GCP_*` knobs and `PORT` (Cloud Run + Dockerfile use 8080). Uses the same gcloud escaping
 * rules as bedrock (`scripts/setEnvVarsGcloud.mjs`) so values like `SCOPES=a,b,c` work.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnvFile } from './parseEnvFile.mjs';
import { formatSetEnvVarsForGcloud } from './setEnvVarsGcloud.mjs';

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
  if (parts.length > 0) {
    const combined = formatSetEnvVarsForGcloud(parts.join(','));
    args.push('--set-env-vars', combined);
    console.log(`Including ${ parts.length } variable(s) from .env in Cloud Run (deploy knobs and PORT omitted).`);
  } else {
    console.warn('No non-empty keys from .env to pass to Cloud Run (check .env and exclusions).');
  }
} else {
  console.warn('.env not found — deploy proceeds without --set-env-vars from file.');
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

/** Keys only used locally / by this script — never sent to the container. */
function deployExcludeKeys() {
  const s = new Set([
    'PORT',
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
  ]);
  for (const k of (process.env.GCP_DEPLOY_ENV_EXCLUDE ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)) {
    s.add(k);
  }
  return s;
}
