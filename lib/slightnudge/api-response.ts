/** Keep failures textual and bounded so the existing editor error UI can show them. */
export async function readApiJson<T = any>(response: Response): Promise<T> {
  const url = response.url || '<unknown URL>';
  let body: string;
  try { body = await response.text(); }
  catch { throw Object.assign(new Error(`Could not read API response from ${url} (HTTP ${response.status}): <body unavailable>`), { name: 'ApiResponseError' }); }
  if (!body.trim()) throw Object.assign(new Error(`Invalid JSON response from ${url} (HTTP ${response.status}): <empty body>`), { name: 'ApiResponseError' });
  try { return JSON.parse(body) as T; }
  catch { throw Object.assign(new Error(`Invalid JSON response from ${url} (HTTP ${response.status}): ${body.slice(0, 200)}`), { name: 'ApiResponseError' }); }
}

export function apiResponseDiagnostic(error: unknown): string {
  return error instanceof Error && error.name === 'ApiResponseError' ? ` ${error.message}` : '';
}
