/**
 * 1) Start cloudflared, wait for public URL, sync .env + shopify.app.toml.
 * 2) Open dev + shopify CLI in new tabs (macOS Terminal / iTerm via `ttab`).
 * 3) Keep tunnel running in this terminal.
 *
 * Requires Accessibility permission for Terminal/iTerm — see `ttab` readme.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getRepoRoot, loadPortFromEnv, runTunnelUntilPropagated } from './tunnel-sync-lib.mjs';

const root = getRepoRoot();
const ttabBin = join(root, 'node_modules', '.bin', 'ttab');

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function spawnTab(title, npmScript) {
  const argv = existsSync(ttabBin)
    ? [ ttabBin, '-t', title, '-d', root, 'npm', 'run', npmScript ]
    : [ 'npx', 'ttab', '-t', title, '-d', root, 'npm', 'run', npmScript ];

  const child = spawn(argv[ 0 ], argv.slice(1), {
    stdio: 'inherit',
    cwd: root,
    shell: false,
  });

  return new Promise((resolve, reject) => {
    child.on('exit', (code) => resolve(code ?? 0));
    child.on('error', reject);
  });
}

if (process.platform === 'win32') {
  console.error(
    '`npm run dev:tabs` uses ttab (macOS/Linux). On Windows use: npm run dev:auto or npm run tunnel + npm run dev + npm run shopify:dev',
  );
  process.exit(1);
}

const port = loadPortFromEnv(root);

console.log('Starting Cloudflare tunnel — will sync HOST to .env and shopify.app.toml when URL appears…\n');

const tunnelProc = await runTunnelUntilPropagated(port, root);

console.log('Opening dev + shopify tabs. Leave this window open — the tunnel runs here.\n');

await spawnTab('minishopi dev', 'dev');
await delay(500);
await spawnTab('minishopi shopify', 'shopify:dev');

console.log('\nDone. Ctrl+C here stops the tunnel.\n');

const stop = () => {
  try {
    tunnelProc.kill('SIGTERM');
  } catch {}
  process.exit(0);
};

process.on('SIGINT', stop);
process.on('SIGTERM', stop);

await new Promise(() => {});
