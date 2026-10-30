/** Shared source/runtime validation; no URL is opened by this function. */
export function validLinkDestination(value: string) {
  if (!value || value.length > 2048 || value !== value.trim() || /[\\\u0000-\u001f\u007f]/.test(value) || /^\/\//.test(value)) return false;
  const scheme = value.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
  if (!scheme) return true;
  if (!['http', 'https', 'mailto', 'tel'].includes(scheme)) return false;
  try { const url = new URL(value); return scheme === 'http' || scheme === 'https' ? !!url.hostname : !/%0[ad]/i.test(value); } catch { return false; }
}
