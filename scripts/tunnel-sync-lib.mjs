/**
 * Capture Cloudflare quick-tunnel HTTPS URL, normalize it, and write it to
 * `.env` (HOST) and `shopify.app.toml` (application_url + redirect_urls).
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const TRY_CLOUDFLARE_URL = /https:\/\/[-a-zA-Z0-9.]+\.trycloudflare\.com/;

export function getRepoRoot() {
  return root;
}

export function normalizeTunnelOrigin(raw) {
  const u = raw.trim().replace(/\/+$/, '');
  if (!TRY_CLOUDFLARE_URL.test(u)) {
    throw new Error(`expected a https://…trycloudflare.com URL, got: ${ raw }`);
  }
  return u;
}

export function loadPortFromEnv(repoRoot = root) {
  const envPath = join(repoRoot, '.env');
  if (!existsSync(envPath)) return 3121;
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^PORT\s*=\s*(.+)$/);
    if (m) {
      const p = Number(m[ 1 ].trim().replace(/^["']|["']$/g, ''), 10);
      if (Number.isFinite(p) && p > 0) return p;
    }
  }
  return 3121;
}

function upsertEnvKey(envPath, key, value) {
  const raw = readFileSync(envPath, 'utf8');
  const lines = raw.split(/\r?\n/);
  let found = false;
  const out = lines.map((line) => {
    const t = line.trim();
    if (t.startsWith(`${ key }=`) || t.startsWith(`${ key } =`)) {
      found = true;
      return `${ key }=${ value }`;
    }
    return line;
  });
  if (!found) {
    if (out.length && out[ out.length - 1 ] !== '') {
      out.push('');
    }
    out.push(`${ key }=${ value }`);
  }
  const trailing = raw.endsWith('\n') ? '\n' : '';
  writeFileSync(envPath, out.join('\n') + trailing);
}

function patchShopifyAppToml(tomlPath, origin) {
  const raw = readFileSync(tomlPath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[ i ];
    if (/^\s*application_url\s*=/.test(line)) {
      out.push(`application_url = '${ origin }/'`);
      i++;
      continue;
    }
    if (/^\s*redirect_urls\s*=/.test(line)) {
      out.push(`redirect_urls = [`);
      out.push(`  '${ origin }/auth/callback',`);
      out.push(']');
      i++;
      while (i < lines.length && lines[ i ].trim() !== ']') {
        i++;
      }
      if (i < lines.length && lines[ i ].trim() === ']') {
        i++;
      }
      continue;
    }
    out.push(line);
    i++;
  }
  writeFileSync(tomlPath, out.join('\n') + '\n');
}

export function propagateTunnelOrigin(origin, repoRoot = root) {
  const normalized = normalizeTunnelOrigin(origin);
  const envPath = join(repoRoot, '.env');
  const tomlPath = join(repoRoot, 'shopify.app.toml');

  if (!existsSync(envPath)) {
    throw new Error(`missing ${ envPath } — copy .env.example to .env first`);
  }
  if (!existsSync(tomlPath)) {
    throw new Error(`missing ${ tomlPath } — copy shopify.app.example.toml to shopify.app.toml first`);
  }

  upsertEnvKey(envPath, 'HOST', normalized);
  patchShopifyAppToml(tomlPath, normalized);

  console.log('');
  console.log('Synced tunnel URL to:');
  console.log(`  .env HOST=${ normalized }`);
  console.log(`  shopify.app.toml application_url + redirect_urls`);
  console.log('');
}

function resolveCloudflaredSpawn(repoRoot) {
  const bin = join(repoRoot, 'node_modules', '.bin', 'cloudflared');
  if (existsSync(bin)) {
    return { file: bin, shell: false };
  }
  return { file: 'npx', shell: true, prefixArgs: [ 'cloudflared' ] };
}

/**
 * Starts cloudflared, waits for the public trycloudflare.com URL, propagates it,
 * then returns the still-running cloudflared child process.
 */
export function runTunnelUntilPropagated(port, repoRoot = root) {
  return new Promise((resolve, reject) => {
    const { file, shell, prefixArgs = [] } = resolveCloudflaredSpawn(repoRoot);
    const tunnelArgs = [ ...prefixArgs, 'tunnel', '--url', `http://127.0.0.1:${ port }` ];

    const child = spawn(file, tunnelArgs, {
      cwd: repoRoot,
      stdio: [ 'ignore', 'pipe', 'pipe' ],
      shell,
      env: { ...process.env },
    });

    let buf = '';
    let settled = false;
    const deadline = Date.now() + 90_000;

    const timer = setInterval(() => {
      if (Date.now() > deadline && !settled) {
        fail(new Error('Timed out waiting for a trycloudflare.com URL from cloudflared'));
      }
    }, 500);

    function fail(err) {
      if (settled) return;
      settled = true;
      clearInterval(timer);
      try {
        child.kill('SIGTERM');
      } catch {}
      reject(err);
    }

    function tryParseAndPropagate(chunk) {
      buf += chunk.toString('utf8');
      const m = buf.match(TRY_CLOUDFLARE_URL);
      if (!m || settled) return;
      try {
        settled = true;
        clearInterval(timer);
        propagateTunnelOrigin(m[ 0 ], repoRoot);
        resolve(child);
      } catch (e) {
        fail(e);
      }
    }

    function onData(chunk) {
      process.stderr.write(chunk);
      tryParseAndPropagate(chunk);
    }

    child.stdout.on('data', onData);
    child.stderr.on('data', onData);

    child.on('error', (e) => fail(e));
    child.on('exit', (code) => {
      if (!settled) {
        fail(new Error(`cloudflared exited with code ${ code } before a tunnel URL appeared`));
      }
    });
  });
}
