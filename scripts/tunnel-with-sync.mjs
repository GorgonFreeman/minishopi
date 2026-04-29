#!/usr/bin/env node
/**
 * Run cloudflared and sync the printed URL into .env + shopify.app.toml.
 * Leave this process running — it is the tunnel.
 */
import { loadPortFromEnv, runTunnelUntilPropagated, getRepoRoot } from './tunnel-sync-lib.mjs';

const root = getRepoRoot();
const port = loadPortFromEnv(root);

console.log(`cloudflared → http://127.0.0.1:${ port } (waiting for public URL…) \n`);

const child = await runTunnelUntilPropagated(port, root);

console.log('Tunnel is up — keep this window open.\n');

const stop = () => {
  try {
    child.kill('SIGTERM');
  } catch {}
  process.exit(0);
};

process.on('SIGINT', stop);
process.on('SIGTERM', stop);

await new Promise((resolve) => {
  child.on('exit', resolve);
});
