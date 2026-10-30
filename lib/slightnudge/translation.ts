export interface Translation { x: number; y: number }
export function validTranslation(value: Translation) {
  return [value.x, value.y].every(axis => Number.isInteger(axis) && Math.abs(axis) <= 2048);
}
/** Only explicit pixel translations authored by this control are merged.
 * Other transforms may compose differently between Tailwind versions. */
export function readTranslation(classes: string): Translation {
  const result = { x: 0, y: 0 };
  const seen = new Set<string>();
  for (const token of classes.split(/\s+/).filter(Boolean)) {
    if (/\[(?:transform|translate|rotate|scale):/.test(token)) throw new Error('This element already has a transform that Move cannot merge safely. Nothing was changed.');
    if (!/(?:^|:)(?:!?-?(?:translate|rotate|scale|skew|transform|perspective)(?:-|!|$))/.test(token)) continue;
    const match = token.match(/^translate-([xy])-\[(-?\d+)px\]$/);
    if (!match || seen.has(match[1])) throw new Error('This element already has a transform that Move cannot merge safely. Nothing was changed.');
    seen.add(match[1]); result[match[1] as 'x' | 'y'] = Number(match[2]);
  }
  if (!validTranslation(result)) throw new Error('This element is outside the supported movement range. Nothing was changed.');
  return result;
}

export function translatedClasses(classes: string, position: Translation) {
  if (!validTranslation(position)) throw new Error('Choose a position within the supported canvas range.');
  readTranslation(classes);
  const tokens = classes.split(/\s+/).filter(Boolean);
  for (const axis of ['x', 'y'] as const) {
    const replacement = `translate-${axis}-[${position[axis]}px]`;
    const index = tokens.findIndex(token => token.startsWith(`translate-${axis}-[`));
    if (index < 0) tokens.push(replacement); else tokens[index] = replacement;
  }
  return tokens.join(' ');
}

export function snappedMove(deltaX: number, deltaY: number, scale: number, bounds: { minX: number; maxX: number; minY: number; maxY: number }, lockAxis = false): Translation {
  if (![deltaX, deltaY, scale, ...Object.values(bounds)].every(Number.isFinite) || scale <= 0) throw new Error('The canvas could not be measured.');
  let x = deltaX / scale; let y = deltaY / scale;
  if (lockAxis) { if (Math.abs(x) >= Math.abs(y)) y = 0; else x = 0; }
  const snap = (value: number, min: number, max: number) => Math.max(Math.ceil(min / 4) * 4, Math.min(Math.floor(max / 4) * 4, Math.round(value / 4) * 4));
  if (bounds.minX > bounds.maxX || bounds.minY > bounds.maxY) throw new Error('This element is larger than the visible canvas. Reduce its width before moving it.');
  return { x: snap(x, bounds.minX, bounds.maxX), y: snap(y, bounds.minY, bounds.maxY) };
}
