'use client';
import { ChevronRight } from 'lucide-react';
import { scopedUtilities } from '@/lib/slightnudge/appearance-values';
import styles from './appearance-controls.module.css';
const controls = [
  ['minWidth','Minimum width',['min-w-0','min-w-full','min-w-min','min-w-max','min-w-fit'],['0 · allow shrinking','100%','Min content','Max content','Fit content']],
  ['maxWidth','Maximum width',['max-w-none','max-w-sm','max-w-md','max-w-lg','max-w-xl','max-w-2xl','max-w-4xl','max-w-6xl'],['No limit','Small','Medium','Large','Extra large','2× large','4× large','6× large']],
  ['minHeight','Minimum height',['min-h-0','min-h-full','min-h-screen'],['0','100% of parent','Viewport height']],
  ['flexGrow','Grow',['grow-0','grow'],['Off','Fill available space']],
  ['flexShrink','Shrink',['shrink-0','shrink'],['Off · preserve size','Allow shrinking']],
  ['alignSelf','Self alignment',['self-auto','self-start','self-center','self-end','self-stretch'],['Auto','Start','Center','End','Stretch']],
] as const;
export function ConstraintControls({classes,computed,scope,disabled,onChange}:{classes:string;computed:Record<string,string>;scope:string;disabled:boolean;onChange(property:string,value:string):void}){
  const interaction=['hover','focus','focus-visible','active'].includes(scope);
  const tokens=scopedUtilities(classes,scope),flex=computed.parentDisplay?.includes('flex'),item=/flex|grid/.test(computed.parentDisplay||'');
  return <details className={styles.section}><summary><ChevronRight size={13} className={styles.chevron}/>Constraints</summary><div className={styles.content}>
    <p className={styles.note}>{interaction?'Choose Default state or a responsive breakpoint to edit constraints.':`${scope?`${scope} and larger sizes`:'All sizes, unless a breakpoint overrides them'}. Missing source values show the rendered value.`}</p>
    {controls.filter(([property])=>property==='alignSelf'?item:!['flexGrow','flexShrink'].includes(property)||flex).map(([property,label,values,labels])=>{
      const authored=values.filter(value=>tokens.includes(value));const value=authored.length===1?authored[0]:'';
      return <label key={property} className={styles.row}><span>{label}</span><select aria-label={`Constraint ${label.toLowerCase()}`} value={value} disabled={disabled||interaction} onChange={event=>onChange(property,event.target.value)}>{!value&&<option value="" disabled>{authored.length>1?'Conflicting values':`Computed · ${computed[property]||'not set'}`}</option>}{values.map((value,index)=><option key={value} value={value}>{labels[index]}</option>)}</select></label>;
    })}
    <p className={styles.note}>Percentages depend on the parent’s size. Grow and shrink appear for flex items. Existing custom constraints stay in source.</p>
  </div></details>;
}
