import Link from 'next/link';
import { ArrowRight, Check, CircleHelp } from 'lucide-react';
import { MarketingFooter } from '@/components/MarketingFooter';

export const metadata = { title: 'Pricing', description: 'SlightNudge is in early local development. See what is available today and how to try it.' };

export default function PricingPage() {
  return <main className="sn-marketing-page sn-content-route">
    <section className="sn-route-hero sn-pricing-hero sn-marketing-container"><p className="sn-marketing-eyebrow">Pricing, without the guesswork</p><h1>No plan to pick.<br/><span>Nothing to buy yet.</span></h1><p className="sn-marketing-lede">SlightNudge is an early local-first build. Hosted plans and billing are not available, so there’s no subscription hiding behind the demo.</p></section>
    <section className="sn-marketing-section sn-pricing-section"><div className="sn-marketing-container sn-pricing-layout"><article className="sn-pricing-card"><div className="sn-pricing-card-head"><span className="sn-pricing-status"><i/> Available locally</span><h2>Playground</h2><p>Explore the editing workflow with the included sample project.</p></div><div className="sn-pricing-price">Free <span>to explore locally</span></div><ul><li><Check size={16}/> Five editable sample pages</li><li><Check size={16}/> Source-aware element inspection</li><li><Check size={16}/> Supported visual edits and undo</li><li><Check size={16}/> No account or repository required</li></ul><Link className="sn-marketing-button sn-marketing-button-primary" href="/editor">Open the playground <ArrowRight size={16}/></Link><small>Runs in this development workspace.</small></article><aside className="sn-pricing-explainer"><p className="sn-marketing-eyebrow">When hosted access is ready</p><h2>We’ll publish the real offer here.</h2><p>Private repository access, hosted workspaces, and paid plans are not available yet. We won’t put placeholder prices or a fake launch discount in their place.</p><div className="sn-pricing-note"><CircleHelp size={17}/><span><strong>Already have the project running?</strong><br/>Your local workspace remains available without choosing a plan.</span></div><Link className="sn-marketing-text-link" href="/how-it-works">See current product limits <ArrowRight size={15}/></Link></aside></div></section>
    <MarketingFooter/>
  </main>;
}
