import { cn } from '@/lib/cn';

const items = [
  { id: 1, name: 'Project Aurora', status: 'In progress', active: true },
  { id: 2, name: 'Project Borealis', status: 'Paused', active: false },
  { id: 3, name: 'Project Celestial', status: 'Review', active: false },
];

export function CardListSection() {
  return (
    <section id="card-list-section" className="mb-16">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Active Workstreams</h2>
        <p className="mt-1 text-sm text-slate-500">Comparing static cards against mapped lists.</p>
      </div>

      {/* Static standalone card */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Featured Workstream</h3>
        <p className="mt-1 text-sm text-slate-600">This card is static and outside any loop.</p>
        <span className="mt-3 inline-block rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Static Tier</span>
      </div>

      {/* Mapped list of cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <article
            key={item.id}
            className={cn('rounded-2xl border border-slate-200 bg-white p-5', item.active && 'ring-2 ring-indigo-500')}
          >
            <h4 className="font-semibold text-slate-900">{item.name}</h4>
            <p className="mt-1 text-sm text-slate-500">{item.status}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
