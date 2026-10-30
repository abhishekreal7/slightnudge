import Link from 'next/link';
import { ArrowUpRight, Check, Move, Type } from 'lucide-react';

const changeCards = [
  {
    icon: Type,
    kind: 'Design review',
    title: 'Headline update',
    detail: '“This feels clearer at a glance.”',
    meta: 'Typography · Just now',
    badge: 'Text',
    tone: 'mint',
  },
  {
    icon: Move,
    kind: 'Layout review',
    title: 'Section spacing',
    detail: '“The content has room to breathe now.”',
    meta: 'Spacing · 2m ago',
    badge: 'Layout',
    tone: 'blue',
  },
  {
    icon: Check,
    kind: 'Content review',
    title: 'Button label',
    detail: '“Get started” makes the next step clear.',
    meta: 'Button · 5m ago',
    badge: 'Copy',
    tone: 'lime',
  },
];

function ChangeCard({ item }: { item: (typeof changeCards)[number] }) {
  const Icon = item.icon;
  return (
    <article className="sn-review-card">
      <div className="sn-review-card-top">
        <span className={`sn-review-icon is-${item.tone}`}><Icon size={15} strokeWidth={2.2} /></span>
        <div className="sn-review-card-title"><strong>{item.title}</strong><span>{item.kind}</span></div>
        <span className="sn-review-badge">{item.badge}</span>
      </div>
      <p>{item.detail}</p>
      <span className="sn-review-card-meta"><i />{item.meta}<span className="sn-review-example">Example</span></span>
    </article>
  );
}

export function ReviewWorkflowSection() {
  return (
    <section className="sn-review-section" aria-labelledby="sn-review-heading">
      <div className="sn-review-inner">
        <div className="sn-review-copy">
          <span className="sn-review-tag"><i />Review before apply</span>
          <div className="sn-review-summary" aria-label="Select, inspect, and approve each change">
            <strong>03</strong>
            <span><b>Select</b><i /> <b>Inspect</b><i /> <b>Approve</b></span>
          </div>
          <h2 id="sn-review-heading">Changes you<br />can <span>see.</span></h2>
          <p>Start on the page, trace the edit to its source, and decide what happens next. Every change stays yours to review.</p>
          <div className="sn-review-trust">
            <span><Check size={13} /> Local source</span>
            <span><Check size={13} /> Clear diffs</span>
            <span><Check size={13} /> Your call</span>
          </div>
          <Link className="sn-review-cta" href="/studio">Open the playground <ArrowUpRight size={15} /></Link>
        </div>

        <div className="sn-review-visual">
          <div className="sn-review-phone" role="img" aria-label="Preview of source-aware edit review cards">
            <div className="sn-review-phone-top"><span>09:41</span><span className="sn-review-signal"><i /><i /><i /><i /></span></div>
            <div className="sn-review-phone-heading"><strong>New notifications</strong></div>
            <div className="sn-review-mask" aria-hidden="true">
              <div className="sn-review-track">
                <div className="sn-review-card-set">{changeCards.map((item) => <ChangeCard item={item} key={item.title} />)}</div>
                <div className="sn-review-card-set">{changeCards.map((item) => <ChangeCard item={item} key={`repeat-${item.title}`} />)}</div>
              </div>
            </div>
            <div className="sn-review-phone-bottom"><i /></div>
          </div>
        </div>
      </div>
    </section>
  );
}
