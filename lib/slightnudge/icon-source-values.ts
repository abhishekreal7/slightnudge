/** Shared with the serialized browser bridge; keep this function self-contained. */
export function validIconValue(property: string, value: string) {
  if (property === 'size' || property === 'strokeWidth') return /^\d+(?:\.\d{1,2})?$/.test(value) && Number(value) >= (property === 'size' ? 8 : 0.25) && Number(value) <= (property === 'size' ? 256 : 8);
  return property === 'color' && (/^#[a-f\d]{6}$/i.test(value) || value === 'currentColor' || value === 'none');
}
