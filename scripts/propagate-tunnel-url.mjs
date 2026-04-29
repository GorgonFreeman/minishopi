#!/usr/bin/env node
/**
 * Manual: propagate a known tunnel URL without running cloudflared.
 * usage: npm run propagate-tunnel -- https://subdomain.trycloudflare.com
 */
import { propagateTunnelOrigin } from './tunnel-sync-lib.mjs';

const raw = process.argv[ 2 ];
if (!raw) {
  console.error('usage: npm run propagate-tunnel -- <https://….trycloudflare.com>');
  process.exit(1);
}

propagateTunnelOrigin(raw);
console.log('Done.');
