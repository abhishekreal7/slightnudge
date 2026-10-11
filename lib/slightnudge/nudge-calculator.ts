export const TAILWIND_SPACING_SCALE = [
  '0', '0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '5', '6', '7', '8', '9',
  '10', '11', '12', '14', '16', '20', '24', '28', '32', '36', '40', '44', '48',
  '52', '56', '60', '64', '72', '80', '96'
];

export interface NudgeClassOptions {
  currentClassName: string;
  direction: 'right' | 'left' | 'up' | 'down';
  stepSize?: 'normal' | 'big';
  breakpoint?: string; // '' (base), 'sm', 'md', 'lg', 'xl'
}

export interface NudgeClassResult {
  oldClass?: string;
  newClass: string;
  newClassName: string;
  stepSize: 'normal' | 'big';
  direction: 'right' | 'left' | 'up' | 'down';
}

/**
 * Returns the next spacing value in the Tailwind scale.
 */
export function getNextSpacingValue(
  currentVal: string,
  directionType: 'increase' | 'decrease',
  stepSize: 'normal' | 'big' = 'normal'
): string {
  const index = TAILWIND_SPACING_SCALE.indexOf(currentVal);
  const delta = stepSize === 'big' ? 4 : 1;

  if (index === -1) {
    return directionType === 'increase' ? (stepSize === 'big' ? '4' : '1') : '0';
  }

  if (directionType === 'increase') {
    const nextIdx = Math.min(index + delta, TAILWIND_SPACING_SCALE.length - 1);
    return TAILWIND_SPACING_SCALE[nextIdx];
  } else {
    const prevIdx = Math.max(index - delta, 0);
    return TAILWIND_SPACING_SCALE[prevIdx];
  }
}

/**
 * Computes the updated className string after nudging.
 */
export function computeNudgedClass(options: NudgeClassOptions): NudgeClassResult {
  const { currentClassName, direction, stepSize = 'normal', breakpoint = '' } = options;

  const tokens = currentClassName.split(/\s+/).filter(Boolean);

  // Determine prefix based on direction
  const isHorizontal = direction === 'right' || direction === 'left';
  const propBase = isHorizontal ? 'ml-' : 'mt-';
  const prefix = breakpoint ? `${breakpoint}:${propBase}` : propBase;

  const directionType = (direction === 'right' || direction === 'down') ? 'increase' : 'decrease';

  let foundIndex = -1;
  let oldClass = '';
  let currentVal = '';

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.startsWith(prefix)) {
      foundIndex = i;
      oldClass = token;
      currentVal = token.slice(prefix.length);
      break;
    }
  }

  let newClass = '';
  if (foundIndex !== -1) {
    const nextVal = getNextSpacingValue(currentVal, directionType, stepSize);
    newClass = `${prefix}${nextVal}`;
    tokens[foundIndex] = newClass;
  } else {
    const initialVal = directionType === 'increase'
      ? (stepSize === 'big' ? '4' : '1')
      : '0';
    newClass = `${prefix}${initialVal}`;
    tokens.push(newClass);
  }

  return {
    oldClass: oldClass || undefined,
    newClass,
    newClassName: tokens.join(' '),
    stepSize,
    direction,
  };
}
