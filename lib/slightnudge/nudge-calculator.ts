export const TAILWIND_SPACING_SCALE = [
  '0', '0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '5', '6', '7', '8', '9',
  '10', '11', '12', '14', '16', '20', '24', '28', '32', '36', '40', '44', '48',
  '52', '56', '60', '64', '72', '80', '96'
];

export const TAILWIND_SIGNED_SPACING_SCALE = [
  '-24', '-20', '-16', '-14', '-12', '-11', '-10', '-9', '-8', '-7', '-6', '-5', '-4', '-3.5', '-3', '-2.5', '-2', '-1.5', '-1', '-0.5',
  '0',
  '0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '5', '6', '7', '8', '9',
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
 * Returns the next spacing value in the Tailwind scale, supporting negative margins.
 */
export function getNextSpacingValue(
  currentVal: string,
  directionType: 'increase' | 'decrease',
  stepSize: 'normal' | 'big' = 'normal'
): string {
  const index = TAILWIND_SIGNED_SPACING_SCALE.indexOf(currentVal);
  const delta = stepSize === 'big' ? 4 : 1;

  if (index === -1) {
    return directionType === 'increase' ? (stepSize === 'big' ? '4' : '1') : (stepSize === 'big' ? '-4' : '-1');
  }

  if (directionType === 'increase') {
    const nextIdx = Math.min(index + delta, TAILWIND_SIGNED_SPACING_SCALE.length - 1);
    return TAILWIND_SIGNED_SPACING_SCALE[nextIdx];
  } else {
    const prevIdx = Math.max(index - delta, 0);
    return TAILWIND_SIGNED_SPACING_SCALE[prevIdx];
  }
}

/**
 * Computes the updated className string after nudging.
 */
export function computeNudgedClass(options: NudgeClassOptions): NudgeClassResult {
  const { currentClassName, direction, stepSize = 'normal', breakpoint = '' } = options;

  const tokens = currentClassName.split(/\s+/).filter(Boolean);

  // Determine property and prefix based on direction
  const isHorizontal = direction === 'right' || direction === 'left';
  const propBase = isHorizontal ? 'ml-' : 'mt-';
  const bpPrefix = breakpoint ? `${breakpoint}:` : '';
  const tokenRegex = new RegExp(`^${bpPrefix}(-?)${propBase}([0-9.]+)$`);

  const directionType = (direction === 'right' || direction === 'down') ? 'increase' : 'decrease';

  let foundIndex = -1;
  let oldClass = '';
  let currentVal = '';

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const match = token.match(tokenRegex);
    if (match) {
      foundIndex = i;
      oldClass = token;
      const sign = match[1] === '-' ? '-' : '';
      const num = match[2];
      currentVal = sign ? `-${num}` : num;
      break;
    }
  }

  let newClass = '';
  if (foundIndex !== -1) {
    const nextVal = getNextSpacingValue(currentVal, directionType, stepSize);
    if (nextVal.startsWith('-')) {
      newClass = `${bpPrefix}-${propBase}${nextVal.slice(1)}`;
    } else {
      newClass = `${bpPrefix}${propBase}${nextVal}`;
    }
    tokens[foundIndex] = newClass;
  } else {
    const initialVal = directionType === 'increase'
      ? (stepSize === 'big' ? '4' : '1')
      : (stepSize === 'big' ? '-4' : '-1');
    newClass = initialVal.startsWith('-') ? `${bpPrefix}-${propBase}${initialVal.slice(1)}` : `${bpPrefix}${propBase}${initialVal}`;
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
