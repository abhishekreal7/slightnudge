'use client';

import styles from './layout-controls.module.css';

type Choice = readonly [string, string];
const displays: Choice[] = [['block', 'Block'], ['flex', 'Flex'], ['grid', 'Grid'], ['inline-flex', 'Inline flex'], ['inline-block', 'Inline block'], ['hidden', 'Hidden']];
const gaps: Choice[] = [0, 1, 2, 3, 4, 6, 8, 12, 16].map(value => [`gap-${value}`, value ? `Space ${value}` : 'None']);

export function LayoutControls({ classes, computed, disabled, scope = '', onChange }: { classes: string; computed: Record<string, string>; disabled: boolean; scope?: string; onChange(property: string, value: string): void }) {
  const tokens = classes.split(/\s+/).filter(token => scope ? token.startsWith(`${scope}:`) && !token.slice(scope.length + 1).includes(':') : !token.includes(':')).map(token => scope ? token.slice(scope.length + 1) : token);
  const mode = computed.display || tokens.find(token => displays.some(([value]) => value === token)) || '';
  const row = (property: string, label: string, choices: Choice[], fallback?: string) => {
    const authored = choices.filter(([value]) => tokens.includes(value));
    const value = authored.length === 1 ? authored[0][0] : '';
    return <label key={property} className={styles.row}><span>{label}</span><select aria-label={`Layout ${label.toLowerCase()}`} title={`Rendered value: ${computed[property] || 'not set'}`} value={value} disabled={disabled} onChange={event => onChange(property, event.target.value)}>
      {!value && <option value="" disabled>{authored.length > 1 ? 'Conflicting values' : `Computed · ${fallback || computed[property] || 'not set'}`}</option>}
      {choices.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select></label>;
  };
  const resolvedTracks = computed.gridTemplateColumns?.trim().split(/\s+/);
  const tracks = resolvedTracks?.every(track => /^\d+(?:\.\d+)?px$/.test(track)) ? resolvedTracks.length : undefined;
  return <div className={styles.controls} aria-label="Layout controls">
    {row('display', 'Display', displays)}
    {mode.includes('grid') && row('gridTemplateColumns', 'Columns', Array.from({ length: 12 }, (_, index) => [`grid-cols-${index + 1}`, `${index + 1} ${index ? 'columns' : 'column'}`] as const), computed.gridTemplateColumns === 'none' ? 'auto' : tracks ? `${tracks} columns` : 'custom tracks')}
    {mode.includes('flex') && <>
      {row('flexDirection', 'Direction', [['flex-row', 'Row'], ['flex-col', 'Column']])}
      {row('flexWrap', 'Wrapping', [['flex-nowrap', 'No wrap'], ['flex-wrap', 'Wrap'], ['flex-wrap-reverse', 'Reverse wrap']])}
    </>}
    {/flex|grid/.test(mode) && <>
      {row('gap', 'Gap', gaps)}
      {row('alignItems', 'Alignment', [['items-start', 'Start'], ['items-center', 'Center'], ['items-end', 'End'], ['items-stretch', 'Stretch']])}
      {row('justifyContent', 'Distribution', [['justify-start', 'Start'], ['justify-center', 'Center'], ['justify-end', 'End'], ['justify-between', 'Space between'], ['justify-around', 'Space around'], ['justify-evenly', 'Space evenly']])}
    </>}
    <p className={styles.note}>Spacing uses your project’s tokens. Values without a source token show the computed layout.</p>
  </div>;
}
