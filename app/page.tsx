'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { trackFunnelEvent } from '@/lib/analytics/events';
import { Check, ChevronDown, ArrowUpRight, Copy, ShieldCheck, ScanSearch, Terminal, CircleAlert } from 'lucide-react';

const fixPrompt = `A checkout request returns HTTP 500 when the user submits an order.\n\nReproduction: POST /api/checkout\nObserved: 500 Internal Server Error (312 ms)\nExpected: a successful response or a structured validation error.\n\nInspect the checkout handler for unhandled database or configuration errors. Return a structured response and add a regression test for this failure path.`;

const faq = [
  ['How accurate are the findings?', 'ShipCheck reports findings with browser evidence such as reproduction steps, console output, network responses, and screenshots. Automated exploration can miss bugs or flag behavior that needs human review; treat each report as an evidence-backed lead, not a proof of correctness.'],
  ['Is it safe to scan my app?', 'You must verify that you control the target domain before a scan can run. The browser uses isolated sessions, and the runner avoids entering real payment details or intentionally destructive actions. Use a test account for authenticated flows.'],
  ['What is not tested?', 'ShipCheck does not perform load or stress testing, submit real financial transactions, or complete third-party OAuth flows that require external 2FA. Coverage depends on routes and flows the browser can reach.'],
  ['What happens if a paid scan fails?', 'If execution fails because of an infrastructure or internal pipeline error, the paid scan is automatically refunded. See the refund policy for details.'],
];

export default function HomePage() {
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    trackFunnelEvent('visit', { referrer: document.referrer });
    const nodes = document.querySelectorAll<HTMLElement>('[data-sequence-step]');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setStep(Number((entry.target as HTMLElement).dataset.sequenceStep));
      });
    }, { rootMargin: '-38% 0px -38% 0px', threshold: 0 });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(fixPrompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch { setCopied(false); }
  }

  function startScan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.location.href = url.trim() ? `/new?url=${encodeURIComponent(url.trim())}` : '/new';
  }

  return <>
    <div className="hero-glow" aria-hidden="true" />
    <div className="page-shell">
      <section className="hero section-pad">
        <div className="hero-copy">
          <p className="eyebrow"><span className="status-dot" /> Browser QA for the last mile</p>
          <h1>Find the bug<br />before <span className="accent-text">your users do.</span></h1>
          <p className="hero-lede">ShipCheck puts a real browser through your app, then gives you the evidence and a fix prompt to move forward.</p>
          <form onSubmit={startScan} className="scan-form">
            <label className="sr-only" htmlFor="target-url">Your app URL</label>
            <input id="target-url" type="url" placeholder="https://yourapp.com" value={url} onChange={(e) => setUrl(e.target.value)} />
            <button className="button button-primary" type="submit">Run a free scan <ArrowUpRight size={16} /></button>
          </form>
          <p className="form-note"><ShieldCheck size={14} /> One finding free · $9.99 for a full scan · no subscription</p>
          <div className="hero-meta"><span><span className="tiny-check">✓</span> Real Chromium sessions</span><span><span className="tiny-check">✓</span> You verify domain ownership</span></div>
        </div>
        <div className="report-frame" aria-label="Sample ShipCheck report from a benchmark test run">
          <div className="frame-topbar"><div className="window-dots"><i/><i/><i/></div><span>shipcheck / report / benchmark-01</span><span className="frame-status"><span className="status-dot red"/> 4 findings</span></div>
          <div className="report-inner">
            <div className="report-heading"><div><span className="report-kicker">BENCHMARK RUN · CHECKOUT FLOW</span><h2>Checkout request fails</h2><p>Buggy Acme SaaS <span className="middot">·</span> Chromium desktop</p></div><span className="severity-pill">Critical</span></div>
            <div className="report-snapshot"><Image src="/benchmark-checkout.png" alt="Recorded benchmark browser run showing the checkout flow returning HTTP 500" width={1280} height={800} priority sizes="(max-width: 800px) 92vw, 620px" /></div>
            <div className="evidence-row"><div className="evidence-icon"><CircleAlert size={16}/></div><div><strong>POST /api/checkout</strong><span>HTTP 500 · 312 ms</span></div><span className="evidence-tag">NETWORK</span></div>
            <div className="fix-preview"><div className="fix-top"><span><Terminal size={14}/> Suggested fix prompt</span><button onClick={copyPrompt} type="button" className="copy-button">{copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? 'Copied' : 'Copy'}</button></div><p>Inspect the checkout handler for unhandled database or configuration errors. Return a structured response and add a regression test…</p></div>
          </div>
          <div className="frame-caption">Recorded against ShipCheck’s benchmark app <span>·</span> Evidence from a real browser run</div>
        </div>
      </section>

      <section className="sequence-section section-pad" aria-labelledby="sequence-title">
        <div className="section-heading"><p className="eyebrow">FROM URL TO FIX</p><h2 id="sequence-title">A browser does the<br className="desktop-break"/> clicking. You get the proof.</h2></div>
        <div className="sequence-layout">
          <div className="sequence-steps">
            {[
              ['01', 'Point it at your app', 'Verify a domain you control and choose the flows you want explored.'],
              ['02', 'Let the browser explore', 'An isolated Chromium session follows routes, tries forms, and checks desktop and mobile layouts.'],
              ['03', 'Review what broke', 'Each finding includes steps, a screenshot, and the relevant console or network evidence.'],
              ['04', 'Take the next step', 'Copy a focused repair prompt into the coding tool you already use.'],
            ].map(([number, title, body], i) => <article key={number} data-sequence-step={i} className={`sequence-step ${step === i ? 'is-active' : ''}`}><span className="step-number">{number}</span><div><h3>{title}</h3><p>{body}</p></div></article>)}
          </div>
          <div className="sequence-visual" aria-live="polite">
            <div className="sequence-screen"><div className="screen-chrome"><span/><span/><span/><i>yourapp.com</i></div>
              <div className={`sequence-state state-${step}`}>
                <div className="sequence-url"><span className="status-dot"/> https://yourapp.com <Check size={15}/></div>
                <div className="agent-card"><div className="agent-symbol"><ScanSearch size={19}/></div><div><strong>{step < 2 ? 'Browser agent' : 'Finding confirmed'}</strong><span>{['Target verified', 'Exploring checkout flow', 'HTTP 500 captured', 'Fix prompt ready'][step]}</span></div><span className="agent-time">{step < 2 ? 'RUNNING' : 'DONE'}</span></div>
                <div className="agent-track"><span style={{ transform: `scaleX(${(step + 1) / 4})` }} /></div>
                <div className="sequence-outcome"><span className="outcome-label">{step < 2 ? 'CURRENT ACTION' : 'BROWSER EVIDENCE'}</span><strong>{['Connect to your app', 'Click “Submit checkout”', 'POST /api/checkout → 500', 'Ready to paste into your editor'][step]}</strong>{step === 3 && <button type="button" onClick={copyPrompt} className="sequence-copy">{copied ? 'Prompt copied ✓' : 'Copy fix prompt →'}</button>}</div>
              </div>
            </div><p className="visual-hint">Scroll through the steps <span>·</span> <a href="#sample-report">Skip to sample report</a></p>
          </div>
        </div>
      </section>

      <section className="sample-section section-pad" id="sample-report">
        <div className="sample-copy"><p className="eyebrow">THE REPORT IS THE PRODUCT</p><h2>Useful evidence.<br/>Clear next step.</h2><p>Not a score with no context. Every confirmed issue comes with enough detail to reproduce it, understand the impact, and start a fix.</p><Link href="/pricing" className="text-link">See what’s included <ArrowUpRight size={15}/></Link></div>
        <div className="sample-details">
          <article className="detail-main"><div className="detail-overline"><span className="severity-dot"/> CRITICAL <span>·</span> FUNCTIONAL</div><h3>Checkout endpoint crashes on submission</h3><p>Submitting the checkout form returns an internal server error instead of completing the request or showing a validation message.</p><div className="trace-box"><span>REQUEST</span><code>POST /api/checkout</code><b>500</b></div></article>
          <article className="detail-side"><span className="detail-overline">REPRODUCE</span><ol><li>Open the checkout flow</li><li>Submit the order</li><li>Observe the 500 response</li></ol></article>
          <article className="detail-prompt"><div className="fix-top"><span><Terminal size={14}/> FIX PROMPT</span><button onClick={copyPrompt} type="button" className="copy-button">{copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? 'Copied' : 'Copy prompt'}</button></div><p>Inspect the checkout handler for unhandled database or configuration errors. Return a structured response and add a regression test for this failure path.</p></article>
          <p className="sample-source">Benchmark sample from a recorded run against the included test app.</p>
        </div>
      </section>

      <section className="pricing-section section-pad" id="pricing"><div className="pricing-intro"><p className="eyebrow">SIMPLE, ONE-TIME PRICING</p><h2>Pay for the scan<br/>you need.</h2><p>Start with a real finding, then unlock the full report if you want deeper coverage.</p></div><div className="price-card"><div className="price-card-head"><span>FULL DEEP SCAN</span><p>One payment. No renewal.</p></div><div className="price-amount"><span>$</span>9.99 <small>USD</small></div><ul><li><Check/>Up to 12 exploratory scenarios</li><li><Check/>Desktop and mobile viewports</li><li><Check/>Evidence-backed findings and fix prompts</li><li><Check/>Shareable report and PDF export</li><li><Check/>Automatic refund if execution fails</li></ul><Link href="/new" className="button button-primary price-cta">Start with a free scan <ArrowUpRight size={16}/></Link><p className="price-note">Free preview includes one complete finding.</p></div></section>

      <section className="faq-section section-pad"><div className="faq-intro"><p className="eyebrow">GOOD TO KNOW</p><h2>Before you<br/>run a scan.</h2></div><div className="faq-list">{faq.map(([question, answer], i) => <article className={`faq-item ${openFaq === i ? 'faq-open' : ''}`} key={question}><button type="button" aria-expanded={openFaq === i} onClick={() => setOpenFaq(openFaq === i ? null : i)}><span>{question}</span><ChevronDown size={17}/></button>{openFaq === i && <p>{answer}</p>}</article>)}</div></section>

      <section className="closing-cta"><div><p className="eyebrow">SHIP WITH A LITTLE MORE CONFIDENCE</p><h2>Find out what your<br/>browser finds.</h2></div><Link href="/new" className="button button-light">Run your free scan <ArrowUpRight size={16}/></Link></section>
    </div>
  </>;
}
