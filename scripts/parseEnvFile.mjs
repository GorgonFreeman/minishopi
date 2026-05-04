/**
 * Minimal .env parser (line-based). Last duplicate key wins. No multiline values.
 */
export function parseEnvFile(contents) {
  const out = new Map();
  const lines = contents.split(/\r?\n/u);
  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    let rest = trimmed;
    if (rest.startsWith('export ')) {
      rest = rest.slice(7).trimStart();
    }
    const eq = rest.indexOf('=');
    if (eq === -1) continue;
    const key = rest.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(key)) continue;
    let val = rest.slice(eq + 1).trim();
    val = unquoteValue(val);
    out.set(key, val);
  }
  return out;
}

function unquoteValue(val) {
  if (
    (val.startsWith('"') && val.endsWith('"') && val.length >= 2) ||
    (val.startsWith("'") && val.endsWith("'") && val.length >= 2)
  ) {
    const q = val[0];
    const inner = val.slice(1, -1);
    if (q === '"') {
      return inner
        .replace(/\\n/gu, '\n')
        .replace(/\\r/gu, '\r')
        .replace(/\\"/gu, '"')
        .replace(/\\\\/gu, '\\');
    }
    return inner.replace(/\\'/gu, "'");
  }
  return val;
}
