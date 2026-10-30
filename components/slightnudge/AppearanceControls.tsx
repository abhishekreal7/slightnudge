'use client';
import { ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { gradientUtility, shadowUtility, parseGradient, parseShadow, gradientPattern, shadowPattern, scopedUtilities, type Gradient, type Shadow } from '@/lib/slightnudge/appearance-values';
import styles from './appearance-controls.module.css';

const initialGradient: Gradient = { angle:135, stops:[{color:'#176b55',position:0},{color:'#5ba5c8',position:100}] };
const initialShadow: Shadow = {x:0,y:8,blur:24,spread:0,color:'#00000026'};
const presets: Record<string,Shadow> = {soft:{x:0,y:2,blur:8,spread:0,color:'#00000014'},medium:initialShadow,strong:{x:0,y:16,blur:48,spread:-8,color:'#00000040'}};
export function AppearanceControls({classes,computed,scope,disabled,onChange}:{classes:string;computed:Record<string,string>;scope:string;disabled:boolean;onChange(property:string,value:string):void}){
  const interaction=['hover','focus','focus-visible','active'].includes(scope),locked=disabled||interaction;
  const tokens=scopedUtilities(classes,scope),gradientToken=tokens.find(token=>!!parseGradient(token)),shadowToken=tokens.find(token=>!!parseShadow(token));
  const [gradient,setGradient]=useState<Gradient>(initialGradient),[shadow,setShadow]=useState<Shadow>(initialShadow),[error,setError]=useState('');
  useEffect(()=>{setGradient(gradientToken?parseGradient(gradientToken)!:initialGradient);setError('');},[gradientToken,scope]);
  useEffect(()=>{setShadow(shadowToken?parseShadow(shadowToken)!:initialShadow);setError('');},[shadowToken,scope]);
  let swatch='none';try{swatch=gradientUtility(gradient).slice(4,-1).replaceAll('_',' ');}catch{}
  const apply=(property:string,value:()=>string)=>{try{const token=value();setError('');onChange(property,token);}catch(error){setError(error instanceof Error?error.message:'Check these values.');}};
  const field=(label:string,value:number,min:number,max:number,onValue:(value:number)=>void)=><label className={styles.field}><span>{label.replace(/^(Shadow|Gradient) /,'').replace(/^./,character=>character.toUpperCase())}</span><input aria-label={label} type="number" step={1} min={min} max={max} value={Number.isNaN(value)?'':value} disabled={locked} onChange={event=>onValue(event.target.value===''?NaN:Number(event.target.value))}/></label>;
  return <details className={styles.section}>
    <summary><ChevronRight size={13} className={styles.chevron}/>Fill & effects</summary>
    <div className={styles.content}>
      <p className={styles.note}>{interaction?'Choose Default state or a responsive breakpoint to edit these effects.':`${scope?`${scope} override`:'All sizes'} · Preview now, Save to source when ready.`}</p>
      <details className={styles.group}><summary><ChevronRight size={13} className={styles.chevron}/>Gradient <span>{gradientToken?'Linear':tokens.some(token=>gradientPattern.test(token)&&token!=='bg-none')?'Source gradient':computed.backgroundImage&&computed.backgroundImage!=='none'?'Computed fill':'None'}</span></summary>
        <p className={styles.note}>Set a linear gradient with 2–4 stops. Replaces the gradient in this scope; keeps the solid fill.</p>
        <div aria-label="Gradient swatch" className={styles.swatch} style={{backgroundImage:swatch}}/>
        {field('Gradient angle',gradient.angle,0,360,angle=>setGradient(previous=>({...previous,angle})))}
        {gradient.stops.map((stop,index)=><div className={styles.stop} key={index}>
          <label className={styles.color}><input type="color" aria-label={`Gradient stop ${index+1} picker`} value={/^#[a-f0-9]{6}/i.test(stop.color)?stop.color.slice(0,7):'#000000'} disabled={locked} onChange={event=>setGradient(previous=>({...previous,stops:previous.stops.map((value,i)=>i===index?{...value,color:event.target.value+(value.color.length===9?value.color.slice(7):'')}:value)}))}/><input aria-label={`Gradient stop ${index+1} color`} value={stop.color} maxLength={9} disabled={locked} onChange={event=>setGradient(previous=>({...previous,stops:previous.stops.map((value,i)=>i===index?{...value,color:event.target.value}:value)}))}/></label>
          <input aria-label={`Gradient stop ${index+1} position`} type="number" min={0} max={100} step={1} value={Number.isNaN(stop.position)?'':stop.position} disabled={locked} onChange={event=>setGradient(previous=>({...previous,stops:previous.stops.map((value,i)=>i===index?{...value,position:event.target.value===''?NaN:Number(event.target.value)}:value)}))}/><span>%</span>
          {gradient.stops.length>2&&<button type="button" aria-label={`Remove gradient stop ${index+1}`} disabled={locked} onClick={()=>setGradient(previous=>({...previous,stops:previous.stops.filter((_,i)=>i!==index)}))}>×</button>}
        </div>)}
        <div className={styles.actions}>{gradient.stops.length<4&&<button type="button" disabled={locked} onClick={()=>setGradient(previous=>({...previous,stops:[...previous.stops.slice(0,-1),{color:'#ffffff',position:Math.round((previous.stops.at(-2)!.position+previous.stops.at(-1)!.position)/2)},previous.stops.at(-1)!]}))}>Add stop</button>}<button type="button" disabled={locked} onClick={()=>apply('backgroundImage',()=>gradientUtility(gradient))}>Set gradient</button><button type="button" disabled={locked} onClick={()=>onChange('backgroundImage','bg-none')}>None</button></div>
      </details>
      <details className={styles.group}><summary><ChevronRight size={13} className={styles.chevron}/>Shadow <span>{tokens.includes('shadow-none')?'None':shadowToken?'Custom':tokens.some(token=>shadowPattern.test(token)&&token!=='shadow-none')?'Source shadow':computed.boxShadow&&computed.boxShadow!=='none'?'Computed shadow':'None'}</span></summary>
        <label className={styles.row}><span>Preset</span><select aria-label="Shadow preset" disabled={locked} defaultValue="" onChange={event=>{const preset=presets[event.target.value];if(preset){setShadow(preset);apply('boxShadow',()=>shadowUtility(preset));}else if(event.target.value==='none')onChange('boxShadow','shadow-none');event.currentTarget.value='';}}><option value="" disabled>Choose…</option><option value="none">None</option><option value="soft">Soft</option><option value="medium">Medium</option><option value="strong">Strong</option></select></label>
        <div className={styles.grid}>{field('Shadow X',shadow.x,-100,100,x=>setShadow(previous=>({...previous,x})))}{field('Shadow Y',shadow.y,-100,100,y=>setShadow(previous=>({...previous,y})))}{field('Shadow blur',shadow.blur,0,200,blur=>setShadow(previous=>({...previous,blur})))}{field('Shadow spread',shadow.spread,-100,100,spread=>setShadow(previous=>({...previous,spread})))}</div>
        <label className={styles.row}><span>Color</span><div className={styles.shadowColor}><input type="color" aria-label="Shadow color picker" value={/^#[a-f0-9]{6}/i.test(shadow.color)?shadow.color.slice(0,7):'#000000'} disabled={locked} onChange={event=>setShadow(previous=>({...previous,color:event.target.value+(previous.color.length===9?previous.color.slice(7):'')}))}/><input aria-label="Shadow color" value={shadow.color} maxLength={9} disabled={locked} onChange={event=>setShadow(previous=>({...previous,color:event.target.value}))}/></div></label>
        <p className={styles.note}>Hex colors accept an alpha channel: #00000026. Dimensions use px. Setting a shadow replaces its existing layers.</p>
        <div className={styles.actions}><button type="button" disabled={locked} onClick={()=>apply('boxShadow',()=>shadowUtility(shadow))}>Set shadow</button><button type="button" disabled={locked} onClick={()=>onChange('boxShadow','shadow-none')}>None</button></div>
      </details>
      {error&&<p role="status" className={styles.error}>{error}</p>}
    </div>
  </details>;
}
