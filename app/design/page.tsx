'use client';

import { useState } from 'react';
import { Check, Copy, LoaderCircle, CircleAlert, Menu } from 'lucide-react';

export default function DesignPage() {
  const [copied, setCopied] = useState(false);
  return <main className="design-page"><p className="eyebrow">SHIPCHECK · UI INVENTORY</p><h1>Design system</h1><p>Component states and visual tokens used across the product.</p><div className="design-grid">
    <section className="design-card"><h2>Action states</h2><div className="design-row"><button className="button button-primary">Default</button><button className="button button-primary design-hover">Hover</button><button className="button button-primary design-focus">Focus</button><button className="button button-primary design-loading" disabled><LoaderCircle size={15}/> Loading</button><button className="button button-primary" disabled style={{opacity:.45,cursor:'not-allowed'}}>Disabled</button></div></section>
    <section className="design-card"><h2>Input states</h2><div className="design-row"><input className="design-input" placeholder="Default input"/><input className="design-input design-focus" placeholder="Focus"/><input className="design-input design-error" defaultValue="not-a-url" aria-invalid="true"/><span style={{fontSize:11,color:'var(--danger)'}}>Enter a valid URL</span></div></section>
    <section className="design-card"><h2>Copy feedback</h2><div className="design-row"><button className="copy-button" onClick={()=>{setCopied(true);window.setTimeout(()=>setCopied(false),1800)}}>{copied?<Check size={14}/>:<Copy size={14}/>} {copied?'Copied':'Copy prompt'}</button><span className="design-swatch"><i/> Primary action</span><span className="design-swatch"><i style={{background:'var(--danger)'}}/> Critical finding</span></div></section>
    <section className="design-card"><h2>Feedback and navigation</h2><div className="design-row"><span className="severity-pill">Critical</span><button className="mobile-toggle" aria-label="Menu preview"><Menu size={17}/></button><span style={{display:'inline-flex',gap:7,alignItems:'center',fontSize:11,color:'var(--danger)'}}><CircleAlert size={15}/> Error message</span><span style={{fontSize:11,color:'var(--accent)'}}><Check size={15}/> Domain verified</span></div></section>
    <section className="design-card"><h2>Surface and type</h2><div className="design-row"><span style={{fontSize:28,fontWeight:650,letterSpacing:'-.06em'}}>Evidence over guesswork.</span></div><p style={{fontSize:12,lineHeight:1.7,color:'var(--muted)'}}>Quiet surfaces, readable body text, consistent spacing, and severity colour reserved for findings.</p><span className="design-swatch"><i style={{background:'var(--surface)',border:'1px solid var(--line)'}}/> Base surface</span></section>
  </div></main>;
}
