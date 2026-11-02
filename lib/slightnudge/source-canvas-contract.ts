export const SOURCE_CANVAS_PROTOCOL = 19;

// AOS owns these exact state tokens. Do not generalize this exception to an
// arbitrary extra class: unknown class changes must still fail source checks.
export function sourceClassesMatch(actual: string | null, expected: string | null) {
  const clean = (value: string | null) => (value || '').split(/\s+/).filter(c => c && c !== 'aos-init' && c !== 'aos-animate').join(' ');
  return clean(actual) === clean(expected);
}

export function withRuntimeClasses(authored: string, current: string | null) {
  const classes = authored.split(/\s+/).filter(c => c && c !== 'aos-init' && c !== 'aos-animate');
  const runtime = (current || '').split(/\s+/).filter(c => c === 'aos-init' || c === 'aos-animate');
  return [...classes, ...new Set(runtime)].join(' ');
}
export function resolveResponsiveScopes(scopes: { name: string; media: string; minWidth: number }[], initialFontSize: number) {
  return scopes.map(scope => {
    const value = scope.media.match(/(?:min-width\s*:\s*|width\s*>=\s*)(\d+(?:\.\d+)?)(rem|em|px)/i);
    return { ...scope, minWidth: value ? Number(value[1]) * (value[2].toLowerCase() === 'px' ? 1 : initialFontSize) : scope.minWidth };
  }).filter(scope => scope.minWidth > 0 && scope.minWidth <= 3840).sort((a, b) => a.minWidth - b.minWidth || a.name.localeCompare(b.name));
}
export interface CanvasLocator { path: string; line: number; column: number; elementId?: string; instance?: string }
export interface CanvasRenderPatch { icon?: { before: import('./icon-shape-values').IconShape; after: import('./icon-shape-values').IconShape; beforeClassName: string; afterClassName: string }; nextImage?: boolean; before: CanvasLocator; after: CanvasLocator; className?: string; text?: string; attributes?: Record<string, string | null>; beforeAttributes?: Record<string, string | null>; beforeClassName?: string; beforeText?: string; css?: string; computed?: Record<string, string>; viewportWidth?: number; order?: CanvasLocator[]; orderAfter?: CanvasLocator[]; beforeOrder?: CanvasLocator[] }
export interface CanvasLayer {
  key: string; parentKey?: string; name: string; tagName: string; instances?: number;
  path: string; line: number; column: number; elementId?: string; instance?: string;
  className: string; textContent: string; attributes?: Record<string, string | null>; computed: Record<string, string>;
  rect: { top: number; left: number; width: number; height: number };
}
