import { cn } from '@/lib/cn';

const features = [
  { title: 'Bring work into focus', description: 'Turn big goals into a clear plan your whole team can see.', highlighted: true },
  { title: 'Keep the details close', description: 'Notes, decisions, and next steps stay with the work they support.', highlighted: false },
  { title: 'Move forward together', description: 'Make progress visible without adding another status meeting.', highlighted: false },
];

export function Features() {
  return (
    <section id="features" className="border-y border-slate-200 bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="max-w-2xl"><p className="text-sm font-semibold text-emerald-800">Less overhead, more momentum</p><h2 className="mt-4 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Everything your team needs to move well.</h2></div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className={cn('rounded-3xl border border-slate-200 bg-white p-7 transition-shadow hover:shadow-lg', feature.highlighted && 'border-emerald-200 bg-emerald-50/70')}>
              <span className="grid size-11 place-items-center rounded-2xl bg-emerald-100 text-lg text-emerald-800" aria-hidden="true">✳</span>
              <h3 className="mt-8 text-xl font-semibold tracking-tight">{feature.title}</h3>
              <p className="mt-3 leading-7 text-slate-600">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
