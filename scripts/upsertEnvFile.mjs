import { existsSync, readFileSync, writeFileSync } from 'node:fs';

/**
 * Set or replace a single `KEY=value` line in a dotenv file.
 */
export function upsertEnvKey(envPath, key, value) {
  const newLine = `${ key }=${ formatEnvLineValue(value) }`;
  if (!existsSync(envPath)) {
    writeFileSync(envPath, `${ newLine }\n`, 'utf8');
    return;
  }
  const raw = readFileSync(envPath, 'utf8');
  const re = new RegExp(`^\\s*${ escapeKeyForRegex(key) }\\s*=.*$`, 'mu');
  let out;
  if (re.test(raw)) {
    out = raw.replace(re, newLine);
  } else {
    const sep = raw.length === 0 || raw.endsWith('\n') ? '' : '\n';
    out = `${ raw }${ sep }${ newLine }\n`;
  }
  if (!out.endsWith('\n')) {
    out += '\n';
  }
  writeFileSync(envPath, out, 'utf8');
}

function escapeKeyForRegex(key) {
  return key.replace(/[\\^$*+?.()|[\]{}]/gu, '\\$&');
}

function formatEnvLineValue(value) {
  const s = String(value);
  if (/[\s#"']/u.test(s)) {
    return `"${ s.replace(/\\/gu, '\\\\').replace(/"/gu, '\\"').replace(/\n/gu, '\\n') }"`;
  }
  return s;
}
