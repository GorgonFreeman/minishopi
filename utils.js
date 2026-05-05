/** Strip the `gid://shopify/.../` prefix off a Shopify global id so you get the plain numeric id. */
export function gidToId(gid) {
  if (gid == null) return gid;
  const str = String(gid);
  const idx = str.lastIndexOf('/');
  return idx >= 0 ? str.slice(idx + 1) : str;
}
