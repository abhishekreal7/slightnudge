import Link from 'next/link';
import { ArrowRight, Check, Code2, FileCode2, MousePointer2, ShieldCheck } from 'lucide-react';
import { MarketingFooter } from '@/components/MarketingFooter';
import { ProductWindow } from '@/components/marketing/ProductWindow';
import { ReviewWorkflowSection } from '@/components/marketing/ReviewWorkflowSection';

const workflow = [
  ['01', 'Choose from the live page', 'Select the precise element you want to refine while the rest of the interface stays visible.'],
  ['02', 'Check the source behind it', 'See the mapped file and source location before SlightNudge offers an edit.'],
  ['03', 'Review one focused update', 'Inspect the proposed code change and decide whether it should be applied.'],
];

export default function HomePage() {
  return (
    <main className="sn-marketing-page sn-crawl-page sn-crawl-v2">
      <section className="sn-v2-hero">
        <div className="sn-crawl-shell">
          <div className="sn-v2-hero-copy">
            <p>Visual editing for real projects</p>
            <h1><span className="sn-v2-head-green">One visual editor</span><br /><span className="sn-v2-head-grey">for the page you already own.</span></h1>
            <div><span>Choose an element in context. Trace it to source. Review the exact change before it is applied.</span></div>
            <nav><Link href="/editor" className="sn-v2-primary">Open playground <ArrowRight size={16} /></Link><Link href="/how-it-works" className="sn-v2-secondary">How it works <ArrowRight size={15} /></Link></nav>
            <small><ShieldCheck size={14} /> Local workflow&nbsp;&nbsp;·&nbsp;&nbsp;No automatic commits or pushes</small>
          </div>

          <div className="sn-v2-showcase"><ProductWindow /></div>
        </div>
      </section>

      <section className="sn-v2-rail"><div className="sn-crawl-shell"><span>Built for a careful edit loop</span><b><MousePointer2 size={15} /> Select in context</b><b><FileCode2 size={15} /> Trace to source</b><b><Code2 size={15} /> Review before apply</b></div></section>

      <section className="sn-v2-workflow" id="workflow"><div className="sn-crawl-shell"><div className="sn-v2-section-head"><span>How it works</span><h2>Visual feedback is useful<br />when the code stays clear.</h2><p>SlightNudge is designed for one deliberate change at a time, not a detached design canvas.</p></div><div className="sn-v2-steps">{workflow.map(([number, title, detail]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{detail}</p><i><ArrowRight size={17} /></i></article>)}</div></div></section>

      <section className="sn-v2-source" id="source"><div className="sn-crawl-shell sn-v2-source-grid"><div className="sn-v2-source-copy"><span>Source-aware by design</span><h2>The visible element<br />is only the beginning.</h2><p>Before a control changes anything, it needs a verified path back to the code that produced the selected UI.</p><ul><li><Check size={15} /> The selected element remains obvious</li><li><Check size={15} /> The file and source location stay visible</li><li><Check size={15} /> Unsupported patterns are refused clearly</li></ul><Link href="/editor">Try the playground <ArrowRight size={16} /></Link></div><div className="sn-v2-source-ui"><div className="sn-v2-ui-bar"><span>Northstar / Product overview</span><b>Source verified</b></div><div className="sn-v2-ui-main"><div className="sn-v2-ui-preview"><small>Live preview</small><div><i>Heading · h1</i><strong>Make room for<br />your best work.</strong><p>One thoughtful workspace for the people, projects, and plans that move your business forward.</p><b>Get started <ArrowRight size={11} /></b></div></div><div className="sn-v2-ui-code"><div><FileCode2 size={13} /> app/page.tsx:39</div><code><span>38</span>&lt;h1 className={"{"}</code><code><span>39</span>  <em>&quot;text-4xl font-semibold&quot;</em></code><code><span>40</span>{"}"}&gt;Make room for your best work.&lt;/h1&gt;</code><footer><small>Proposed update</small><p><i>−</i> text-3xl</p><p><b>+</b> text-4xl</p></footer></div></div><div className="sn-v2-ui-foot"><span><Check size={13} /> Source mapping verified</span><span>Review change <ArrowRight size={13} /></span></div></div></div></section>

      <section className="sn-v2-principles" id="principles"><div className="sn-crawl-shell"><div className="sn-v2-section-head"><span>The product rules</span><h2>Useful when it can be exact.</h2></div><div className="sn-v2-principle-grid"><article><span>01</span><h3>Work from the actual page</h3><p>Use a rendered interface to find the concrete thing that needs attention.</p></article><article><span>02</span><h3>Keep each change narrow</h3><p>One selection, one proposed source edit, and a review step before it lands.</p></article><article><span>03</span><h3>Refuse unsafe changes</h3><p>When the source cannot be mapped safely, SlightNudge leaves the project alone.</p></article></div></div></section>

      <ReviewWorkflowSection />

      <section className="sn-v2-closing"><div className="sn-crawl-shell"><div><span>Start in the playground</span><h2>Change the interface.<br />Keep your footing in the code.</h2><p>Open a sample page, select an element, and trace the proposed update.</p></div><Link href="/editor" className="sn-v2-primary">Open playground <ArrowRight size={16} /></Link></div></section>
      <MarketingFooter />
    </main>
  );
}
