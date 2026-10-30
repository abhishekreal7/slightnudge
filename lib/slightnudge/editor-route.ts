export type EditorQuery = Record<string, string | string[] | undefined>;
export type EditorView = 'full' | 'fit';
export function editorView(value: string | string[] | undefined): EditorView {
  return (Array.isArray(value) ? value[0] : value) === 'fit' ? 'fit' : 'full';
}
/** Keep repeated and empty query values; the project lives in the path. */
export function editorHref(project: string | undefined, query: EditorQuery = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) search.append(key, item);
  return `/editor${project ? `/${encodeURIComponent(project)}` : ''}${search.size ? `?${search}` : ''}`;
}
export function legacyStudioEnabled(query: EditorQuery) {
  return process.env.SLIGHTNUDGE_LEGACY_STUDIO === '1' && query.legacyStudio === '1';
}
