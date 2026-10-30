/** The local canvas's supported max-width scale, in rem. Imported/custom
 * project scales need their own compiler-backed capability before dragging. */
export const widthSteps = [
  [24, 'max-w-sm'], [28, 'max-w-md'], [32, 'max-w-lg'], [36, 'max-w-xl'],
  [42, 'max-w-2xl'], [48, 'max-w-3xl'], [56, 'max-w-4xl'], [64, 'max-w-5xl'], [72, 'max-w-6xl'],
] as const;

export interface WidthSnap { width: number; token: string }

export function snapWidth(requested: number, rem = 16, previousToken?: string): WidthSnap {
  if (!Number.isFinite(requested) || !Number.isFinite(rem) || rem <= 0) throw new Error('The canvas dimensions could not be measured.');
  const steps = widthSteps.map(([value, token]) => ({ width: value * rem, token }));
  const nearest = steps.reduce((best, next) => Math.abs(next.width - requested) < Math.abs(best.width - requested) ? next : best);
  const previous = steps.find(step => step.token === previousToken);
  // A small magnetic band avoids flickering between adjacent presets.
  return previous && Math.abs(previous.width - requested) <= Math.abs(nearest.width - requested) + rem / 2 ? previous : nearest;
}

export function widthFromPointer(startWidth: number, startX: number, clientX: number, handle: string, scale = 1): number {
  if (![startWidth, startX, clientX, scale].every(Number.isFinite) || startWidth <= 0 || scale <= 0) throw new Error('The canvas dimensions could not be measured.');
  // These local elements are centered; both edges move around their center.
  const sign = ['w', 'sw', 'nw'].includes(handle) ? -1 : 1;
  return startWidth + (clientX - startX) / scale * sign * 2;
}

export function stepWidth(current: number, direction: -1 | 1, rem = 16): WidthSnap {
  if (!Number.isFinite(current) || current <= 0 || !Number.isFinite(rem) || rem <= 0) throw new Error('The canvas dimensions could not be measured.');
  const steps = widthSteps.map(([value, token]) => ({ width: value * rem, token }));
  return direction === 1
    ? steps.find(step => step.width > current + .5) || steps[steps.length - 1]
    : [...steps].reverse().find(step => step.width < current - .5) || steps[0];
}
