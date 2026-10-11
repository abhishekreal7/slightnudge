'use client';

import { useState } from 'react';
import { Check, CircleAlert, LoaderCircle, Plus } from 'lucide-react';

export default function DesignPage() {
  const [copied, setCopied] = useState(false);
  async function copyPrompt() {
    const prompt = 'Update the heading to use a calmer medium weight, keeping the current size and line break.';
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }
  return <main className="sn-design-page">
    <header className="sn-design-intro"><p className="sn-eyebrow">SLIGHTNUDGE · INTERFACE SYSTEM</p><h1>Clear by design.</h1><p>A compact reference for the type scale, color, and interaction states used across the workspace.</p></header>
    <div className="sn-design-grid">
      <section className="sn-design-card sn-design-type"><p className="sn-design-label">TYPE SCALE · GEIST</p><h2>Make the small changes feel small.</h2><p className="sn-design-lead">Calm, readable text gives the product room to breathe. Headline weight stays medium; emphasis comes from scale and spacing.</p><div className="sn-type-rows"><div><span>Display · 64 / 64 · 500</span><strong>Visual editing, in context.</strong></div><div><span>Section · 30 / 36 · 500</span><strong>Thoughtful changes.</strong></div><div><span>Lead · 18 / 29 · 400</span><p>Start with a page. Select the element. Refine it in place.</p></div><div><span>Body · 16 / 24 · 400</span><p>Edits update your source, so the change stays with your project.</p></div><div><span>Label · 13 / 20 · 500</span><small>LOCAL SOURCE · READY TO EDIT</small></div></div></section>
      <section className="sn-design-card"><p className="sn-design-label">BUTTONS · TACTILE STATES</p><div className="sn-design-stack"><button className="sn-button sn-button-primary"><Plus size={16}/> Default action</button><button className="sn-button sn-button-primary sn-design-hover"><Plus size={16}/> Hover preview</button><button className="sn-button sn-button-primary sn-design-focus"><Plus size={16}/> Focus state</button><button className="sn-button sn-button-primary" disabled><LoaderCircle className="sn-spinner" size={16}/> Loading</button><button className="sn-button sn-button-secondary" disabled>Disabled</button></div></section>
      <section className="sn-design-card"><p className="sn-design-label">INPUTS · FEEDBACK</p><label className="sn-design-field"><span>Project URL</span><input defaultValue="https://github.com/acme/product"/></label><label className="sn-design-field sn-design-field-focus"><span>Focused</span><input placeholder="Enter a repository URL"/></label><label className="sn-design-field sn-design-field-error"><span>Validation error</span><input aria-invalid="true" defaultValue="not-a-url"/></label><p className="sn-form-error"><CircleAlert size={15}/> Enter a valid public GitHub repository URL.</p></section>
      <section className="sn-design-card"><p className="sn-design-label">COLORS · PURPOSEFUL ONLY</p><div className="sn-design-swatches"><div><i className="sn-swatch-accent"/><span>Action · #176B55</span></div><div><i className="sn-swatch-ink"/><span>Ink · #17211F</span></div><div><i className="sn-swatch-line"/><span>Border · #E2E7E4</span></div><div><i className="sn-swatch-danger"/><span>Finding · #B43E35</span></div></div><div className="sn-design-feedback"><Check size={15}/> Change saved to local source</div></section>
      <section className="sn-design-card sn-design-copy"><p className="sn-design-label">COPY · SUCCESS FEEDBACK</p><p className="sn-design-prompt">Update the heading to use a calmer medium weight, keeping the current size and line break.</p><button className="sn-button sn-button-secondary" onClick={() => void copyPrompt()}>{copied ? <Check size={16}/> : <Plus size={16}/>} {copied ? 'Copied to clipboard' : 'Copy fix prompt'}</button></section>
    </div>
  </main>;
}
