'use client';

export default function PlainStaticPage() {
  return (
    <main className="sn-playground-page">
      <section className="sn-playground-hero p-3" id="overview">
                  <div className="sn-playground-visual"><div className="sn-playground-window"><div className="sn-playground-window-head"><span/><span/><span/><i>northstar.app/workspace</i></div><div className="sn-playground-window-body"><div className="sn-playground-sidebar"><span/><span/><span/><span/></div><div className="sn-playground-main"><span className="sn-playground-skeleton short"/><span className="sn-playground-skeleton title"/><div className="sn-playground-cards"><i/><i/><i/></div><div className="sn-playground-chart"><b/><b/><b/><b/><b/><b/><b/></div></div></div></div><div className="sn-playground-floating-card"><span className="sn-playground-check">✓</span><div><strong>Focus time protected</strong><span>Your team is in flow</span></div></div></div>
                  <div className="sn-playground-content p-3 lg:p-4"><p className="sn-playground-eyebrow"><span/> A calmer way to work</p><p className="sn-playground-description text-xl">One thoughtful workspace for the people, projects, and plans that move your business forward.</p><span className="sn-playground-note">Free to start · Set up in minutes</span><h1 id="target" data-source-file="fixtures/1-plain-static.tsx" data-source-line="8" className="ml-2.5 mt-1 text-2xl">Make room for your best work.</h1><a href="#start" className="sn-playground-primary lg:text-lg">Get started <span>→</span></a></div>
                </section>
      <nav className="sn-playground-nav"><a className="sn-playground-logo" href="#overview"><span>n</span> northstar</a><div><a href="#features">Product</a><a href="#pricing">Pricing</a><a href="#resources">Resources</a></div><a className="sn-playground-nav-cta" href="#start">Log in <span>↗</span></a></nav>
      <section className="sn-playground-trust" id="features"><span>Designed for the work that matters</span><div><i>Team planning</i><i>Clear priorities</i><i>One calm workspace</i></div></section>
    </main>
  );
}
