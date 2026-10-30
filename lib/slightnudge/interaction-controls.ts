export const interactionControls = [
  { property: 'transitionProperty', label: 'Transition', options: [
    ['transition-none', 'None'], ['transition', 'Common properties'], ['transition-colors', 'Colors'], ['transition-opacity', 'Opacity'],
    ['transition-transform', 'Transform'], ['transition-all', 'All properties'],
  ] },
  { property: 'transitionDuration', label: 'Duration', options: [
    ['duration-75', '75 ms'], ['duration-100', '100 ms'], ['duration-150', '150 ms'], ['duration-200', '200 ms'],
    ['duration-300', '300 ms'], ['duration-500', '500 ms'], ['duration-700', '700 ms'], ['duration-1000', '1 second'],
  ] },
  { property: 'transitionDelay', label: 'Delay', options: [
    ['delay-0', 'None'], ['delay-75', '75 ms'], ['delay-100', '100 ms'], ['delay-150', '150 ms'],
    ['delay-200', '200 ms'], ['delay-300', '300 ms'], ['delay-500', '500 ms'], ['delay-700', '700 ms'], ['delay-1000', '1 second'],
  ] },
  { property: 'transitionTimingFunction', label: 'Easing', options: [
    ['ease-linear', 'Linear'], ['ease-in', 'Ease in'], ['ease-out', 'Ease out'], ['ease-in-out', 'Ease in and out'],
  ] },
] as const;

/** Exact scope only: a default value must never be presented as a state override. */
export function interactionValue(classes: string, property: string, state = '') {
  const control = interactionControls.find(c => c.property === property);
  if (!control) return '';
  const prefix = state ? `${state}:` : '';
  return control.options.find(([value]) => classes.split(/\s+/).includes(`${prefix}${value}`))?.[0] || '';
}
