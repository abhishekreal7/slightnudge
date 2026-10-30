export type Gradient = { angle: number; stops: { color: string; position: number }[] };
export type Shadow = { x: number; y: number; blur: number; spread: number; color: string };
const color = /^#[a-f0-9]{6}(?:[a-f0-9]{2})?$/i;
const integer = (value: number, min: number, max: number) => Number.isInteger(value) && value >= min && value <= max;
export function gradientUtility(value: Gradient) {
  if (!integer(value.angle, 0, 360) || value.stops.length < 2 || value.stops.length > 4 || value.stops.some((stop, index) => !color.test(stop.color) || !integer(stop.position, 0, 100) || index > 0 && stop.position < value.stops[index - 1].position)) throw Error('Use 2–4 ordered stops, 6- or 8-digit hex colors, and an angle from 0 to 360.');
  return `bg-[linear-gradient(${value.angle}deg,${value.stops.map(stop => `${stop.color.toLowerCase()}_${stop.position}%`).join(',')})]`;
}
export function parseGradient(utility: string): Gradient | undefined {
  if(typeof utility!=='string'||utility.length>512)return undefined;
  const match = utility.match(/^bg-\[linear-gradient\((\d+)deg,(.+)\)\]$/);
  if (!match) return undefined;
  const stops = match[2].split(',').map(stop => { const parts = stop.match(/^(#[a-f0-9]{6}(?:[a-f0-9]{2})?)_(\d+)%$/i); return parts ? { color: parts[1], position: Number(parts[2]) } : undefined; });
  if (stops.some(stop => !stop)) return undefined;
  const value = { angle: Number(match[1]), stops: stops as Gradient['stops'] };
  try { gradientUtility(value); return value; } catch { return undefined; }
}
export function shadowUtility(value: Shadow) {
  if (!integer(value.x, -100, 100) || !integer(value.y, -100, 100) || !integer(value.blur, 0, 200) || !integer(value.spread, -100, 100) || !color.test(value.color)) throw Error('Use whole-pixel offsets/spread within ±100, blur 0–200, and a 6- or 8-digit hex color.');
  return `shadow-[${value.x}px_${value.y}px_${value.blur}px_${value.spread}px_${value.color.toLowerCase()}]`;
}
export function parseShadow(utility: string): Shadow | undefined {
  if(typeof utility!=='string'||utility.length>128)return undefined;
  const match = utility.match(/^shadow-\[(-?\d+)px_(-?\d+)px_(\d+)px_(-?\d+)px_(#[a-f0-9]{6}(?:[a-f0-9]{2})?)\]$/i);
  if (!match) return undefined;
  const value = { x: +match[1], y: +match[2], blur: +match[3], spread: +match[4], color: match[5] };
  try { shadowUtility(value); return value; } catch { return undefined; }
}
export function appearanceValue(property: string, value: string) {
  return property === 'backgroundImage' ? value === 'bg-none' || !!parseGradient(value) : property === 'boxShadow' ? value === 'shadow-none' || !!parseShadow(value) : false;
}
export const gradientPattern = /^(?:bg-(?:none|gradient-.+|linear-.+|\[linear-gradient\(.+\)\])|(?:from|via|to)-.+)$/;
export const shadowPattern = /^shadow(?:-.+)?$/;
/** Match one editing scope, excluding nested variants and colons in arbitrary values. */
export function scopedUtilities(classes: string, scope: string) {
  const prefix = scope ? `${scope}:` : '';
  return classes.split(/\s+/).filter(Boolean).filter(token => token.startsWith(prefix)).map(token => token.slice(prefix.length).replace(/^!|!$/g, '')).filter(token => !token.split('[')[0].includes(':'));
}
