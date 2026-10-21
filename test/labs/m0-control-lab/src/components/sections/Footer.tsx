function TrustBadge() {
  return <span className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600">Thoughtful by design</span>;
}

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10 sm:flex-row sm:items-center sm:justify-between lg:px-10">
        <a href="#top" className="flex items-center gap-3 font-semibold tracking-tight"><span className="grid size-9 place-items-center rounded-xl bg-emerald-700 text-sm font-bold text-white">N</span>Northstar</a>
        <div className="flex flex-wrap items-center gap-3"><TrustBadge /><TrustBadge /></div>
        <p className="text-sm text-slate-500">© 2026 Northstar. Make room for good work.</p>
      </div>
    </footer>
  );
}
