#!/usr/bin/env node
/**
 * Start cloudflared, sync HOST into .env + shopify.app.toml, then run npm run dev.
 * Stops the tunnel when the dev child exits (or on SIGINT).
 */
import { spawn } from 'node:child_process';
import { getRepoRoot, loadPortFromEnv, runTunnelUntilPropagated } from './tunnel-sync-lib.mjs';

const root = getRepoRoot();
const port = loadPortFromEnv(root);

console.log('Starting tunnel; will sync URL, then launch `npm run dev`…\n');

const tunnelProc = await runTunnelUntilPropagated(port, root);

const dev = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', [ 'run', 'dev' ], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
});

const shutdown = () => {
  try {
    tunnelProc.kill('SIGTERM');
  } catch {}
  try {
    dev.kill('SIGTERM');
  } catch {}
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

dev.on('exit', (code) => {
  shutdown();
  process.exit(code ?? 0);
});
