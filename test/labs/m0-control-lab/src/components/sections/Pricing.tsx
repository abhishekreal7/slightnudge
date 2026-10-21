const essentials = ['Unlimited projects', 'Shared team workspace', 'Core planning tools'];

export function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-10">
      <div className="mx-auto max-w-2xl text-center"><p className="text-sm font-semibold text-emerald-800">Straightforward pricing</p><h2 className="mt-4 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Start small. Grow at your pace.</h2><p className="mt-5 text-lg leading-8 text-slate-600">Try the essentials for free, then add more room when your team is ready.</p></div>
      <div className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h3 className="text-xl font-semibold tracking-tight">Free</h3>
          <p className="mt-2 text-sm text-slate-600">For trying a calmer way to work.</p>
          <p className="mt-8"><span className="text-5xl font-semibold tracking-[-0.05em] tabular-nums">$0</span><span className="text-sm text-slate-500"> / month</span></p>
          <ul className="mt-8 space-y-4">{essentials.map((item) => <li key={item} className="flex items-center gap-3 text-sm text-slate-700"><span className="text-emerald-700">✓</span>{item}</li>)}</ul>
          <button type="button">Choose Free</button>
        </article>
        <article className="rounded-3xl bg-slate-950 p-8 text-white shadow-xl shadow-slate-950/10">
          <div className="flex items-center justify-between"><h3 className="text-xl font-semibold tracking-tight">Team</h3><span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-medium text-emerald-200">For growing teams</span></div>
          <p className="mt-2 text-sm text-slate-300">More context for the work you share.</p>
          <p className="mt-8"><span className="text-5xl font-semibold tracking-[-0.05em] tabular-nums">$12</span><span className="text-sm text-slate-300"> / person / month</span></p>
          <ul className="mt-8 space-y-4">{essentials.map((item) => <li key={item} className="flex items-center gap-3 text-sm text-slate-200"><span className="text-emerald-300">✓</span>{item}</li>)}</ul>
          <a href="#faq" className="mt-8 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-100 active:scale-[0.98]">Explore Team</a>
        </article>
      </div>
    </section>
  );
}
