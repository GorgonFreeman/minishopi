/**
 * gcloud --set-env-vars uses commas between KEY=VALUE pairs; values that contain commas
 * (e.g. SCOPES=read_products,write_products) must use the alternate delimiter form.
 * Ported from bedrock/_deploy_scripts/setEnvVarsGcloud.js (same behavior, ESM).
 * @see https://cloud.google.com/sdk/gcloud/reference/topic/escaping
 */

function splitSetEnvVarsPairs(combined) {
  const segments = combined.split(/,(?=[A-Za-z_][A-Za-z0-9_]*=)/u);
  return segments.map((segment) => {
    const eq = segment.indexOf('=');
    if (eq === -1) {
      throw new Error(`Invalid set_env_vars segment (no =): ${ segment }`);
    }
    return {
      key: segment.slice(0, eq).trim(),
      value: segment.slice(eq + 1),
    };
  });
}

function pickDelimiter(pairs) {
  const blob = pairs.map((p) => `${ p.key }=${ p.value }`).join('');
  for (let n = 3; n < 64; n++) {
    const delim = '#'.repeat(n);
    if (!blob.includes(delim)) {
      return delim;
    }
  }
  throw new Error('Could not find a delimiter for gcloud --set-env-vars (values too dense)');
}

/**
 * @param { string } combined e.g. HOSTED=true,SCOPES=read_products,write_products
 * @returns { string } string for gcloud --set-env-vars (may use ^###^... form)
 */
export function formatSetEnvVarsForGcloud(combined) {
  const pairs = splitSetEnvVarsPairs(combined);
  if (pairs.length === 0) {
    return combined;
  }
  const needsDelimiter = pairs.length > 1 || pairs.some((p) => p.value.includes(','));
  if (!needsDelimiter) {
    return combined;
  }
  const delim = pickDelimiter(pairs);
  return `^${ delim }^${ pairs.map((p) => `${ p.key }=${ p.value }`).join(delim) }`;
}
