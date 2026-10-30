'use client';
import { useEffect, useState } from 'react';
import { inspectComponentPropsAPI, type ComponentPropsInfo } from '@/lib/slightnudge/client';

export function ComponentProps({ source, parentPreviewId, drafts, disabled, onChange }: {
  source: { repositoryId?: string; filePath: string; line: number; column: number; elementId?: string; instance?:string; tagName: string };
  parentPreviewId?: string; drafts?:Record<string,string>; disabled: boolean;
  onChange(property:string,value:string,owner?:ComponentPropsInfo['owner']):Promise<unknown>;
}) {
  const key=JSON.stringify([source,parentPreviewId,drafts]);
  const [result,setResult]=useState<{key:string;info:ComponentPropsInfo}>();
  const [values,setValues]=useState<Record<string,string>>({}),[error,setError]=useState(''),[pending,setPending]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();let active=true;
    void inspectComponentPropsAPI({...source,parentPreviewId,drafts},controller.signal).then(info=>{
      if(active){setResult({key,info});setValues(Object.fromEntries(info.fields.map(field=>[field.name,field.value])));setError('');}
    }).catch(()=>{if(active)setResult(undefined)});
    return ()=>{active=false;controller.abort()};
  },[key]);
  if(!result)return null;
  const {info}=result;
  if(!info.fields.length&&!info.reason)return null;
  const locked=disabled||pending||result.key!==key;
  const commit=async(field:ComponentPropsInfo['fields'][number],value:string)=>{
    if(locked||value===field.value)return;
    setValues(previous=>({...previous,[field.name]:value}));setPending(true);setError('');
    try{if(await onChange(field.name,value,info.owner)!==true)setValues(previous=>({...previous,[field.name]:field.value}));}
    catch(error){setError(error instanceof Error?error.message:'This prop could not be updated.');}
    finally{setPending(false)}
  };
  const inputClass='w-full rounded-md border border-[#e6eae7] bg-[#f5f6f5] px-2 py-2 text-xs disabled:opacity-50';
  return <section aria-label="Component properties" className="shrink-0 space-y-3 border-b border-[#edf0ed] px-4 py-4 text-xs">
    <div className="flex items-center justify-between gap-2"><h3 className="font-medium">{source.instance?'This instance':'Component'}</h3><span className="truncate text-[#89938d]">{info.component}</span></div>
    {info.reason&&<p className="text-[11px] leading-relaxed text-[#89938d]">{info.reason}</p>}
    {!!info.fields.length&&<>
      <p className="text-[11px] leading-relaxed text-[#89938d]">{source.instance?'Changes only this component call.':'Changes the prop passed by its direct caller.'}</p>
      {info.owner&&<p title={info.owner.filePath} className="truncate text-[11px] text-[#89938d]">{info.owner.filePath}:{info.owner.line}</p>}
      {info.fields.map(field=><label key={field.name} className="block space-y-2"><span>{field.name}</span>
        {field.type==='boolean'?<select aria-label={`Component prop ${field.name}`} className={inputClass} disabled={locked} value={values[field.name]??field.value} onChange={event=>void commit(field,event.target.value)}><option value="false">Off</option><option value="true">On</option></select>
          :field.type==='enum'?<select aria-label={`Component prop ${field.name}`} className={inputClass} disabled={locked} value={values[field.name]??field.value} onChange={event=>void commit(field,event.target.value)}>{field.options?.map(value=><option key={value} value={value}>{value}</option>)}</select>
          :<textarea aria-label={`Component prop ${field.name}`} rows={field.target==='href'?1:2} maxLength={10000} className={`${inputClass} resize-y`} disabled={locked} value={values[field.name]??field.value} onChange={event=>setValues(previous=>({...previous,[field.name]:event.target.value}))} onBlur={event=>void commit(field,event.target.value)} onKeyDown={event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();setValues(previous=>({...previous,[field.name]:field.value}));}if(event.key==='Enter'&&(event.metaKey||event.ctrlKey)){event.preventDefault();event.currentTarget.blur();}}}/>}
      </label>)}
      <p className="text-[11px] leading-relaxed text-[#89938d]">{result.key!==key?'Checking the current source…':'All sizes · Save writes to the caller · Undo restores the source.'}</p>
    </>}
    {source.instance&&<details className="text-[11px] leading-relaxed text-[#89938d]"><summary className="cursor-pointer">Shared definition</summary><p className="mt-2 break-all">{source.filePath}:{source.line}</p><p className="mt-1">Definition styles affect every use. Edit them in source; these controls change instance props.</p></details>}
    {error&&<p role="status" className="text-[11px] text-[#89938d]">{error}</p>}
  </section>;
}
