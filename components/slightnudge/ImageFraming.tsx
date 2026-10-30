'use client';

const fits = [['object-cover', 'Cover'], ['object-contain', 'Contain'], ['object-fill', 'Stretch'], ['object-none', 'Original size'], ['object-scale-down', 'Scale down']];
const positions = [['object-center', 'Center'], ['object-top', 'Top'], ['object-bottom', 'Bottom'], ['object-left', 'Left'], ['object-right', 'Right']];

export function ImageFraming({ classes, computed, scope, disabled, onChange }: { classes: string; computed: Record<string, string>; scope: string; disabled: boolean; onChange(property: string, value: string): void }) {
  const tokens = classes.split(/\s+/).filter(t => scope ? t.startsWith(scope + ':') : !t.includes(':')).map(t => (scope ? t.slice(scope.length + 1) : t).replace(/^!|!$/g, ''));
  return <section aria-label="Image framing" className="border-b border-[#edf0ed] px-4 py-4 space-y-3">
    <h3 className="font-medium text-xs text-[#354239]">Image framing</h3>
    {([['objectFit', 'Fit', fits], ['objectPosition', 'Focal point', positions]] as const).map(([property, label, choices]) => {
      const value = choices.find(([v]) => tokens.includes(v))?.[0] || '';
      return <label key={property} className="flex items-center justify-between gap-3 text-xs"><span>{label}</span><select aria-label={`Image ${label.toLowerCase()}`} value={value} disabled={disabled || !classes.trim()} onChange={e => onChange(property, e.target.value)} className="w-36 rounded-md border border-[#e6eae7] bg-[#f5f6f5] px-2 py-2">
        {!value && <option value="" disabled>Computed · {computed[property] || 'inherited'}</option>}
        {choices.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
      </select></label>;
    })}
    <p className="text-[11px] leading-relaxed text-[#89938d]">{classes.trim() ? 'Cover crops to the existing frame. Contain shows the whole image. Focal point chooses which part stays in view.' : 'Framing is unavailable for this image source.'}</p>
  </section>;
}
