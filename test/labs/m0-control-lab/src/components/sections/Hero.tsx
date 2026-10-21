type HeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  primaryAction: string;
};

export function Hero({ eyebrow, title, description, primaryAction }: HeroProps) {
  return (
    <section id="top" className="mx-auto grid max-w-7xl gap-16 px-6 pb-28 pt-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-10 lg:pb-36 lg:pt-28">
      <div className="max-w-2xl">
        <p className="mb-6 flex items-center gap-2 text-sm font-medium text-emerald-800"><span className="size-2 rounded-full bg-emerald-600" />{eyebrow}</p>
        <h1 className="max-w-xl text-5xl font-semibold leading-[1.03] tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-7xl">{title}</h1>
        <p className="mt-7 max-w-lg text-lg leading-8 text-slate-600">{description}</p>
        <div className="mt-9 flex flex-wrap items-center gap-5">
          <a href="#pricing" className="rounded-full bg-emerald-700 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 active:scale-[0.98]">{primaryAction}<span aria-hidden="true" className="ml-3">→</span></a>
          <span className="text-sm text-slate-500">Free to start · No card required</span>
        </div>
      </div>
      <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.3)] sm:p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4"><span className="text-sm font-semibold text-slate-800">Today at Northstar</span><span className="text-xs text-slate-500">Tuesday, 9:41 AM</span></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-[#f3f6f3] p-5"><span className="text-xs font-medium text-slate-500">Weekly focus</span><p className="mt-2 text-lg font-semibold tracking-tight">Ship the new workspace</p><div className="mt-5 h-1.5 rounded-full bg-white"><div className="h-full w-2/3 rounded-full bg-emerald-700" /></div><p className="mt-2 text-xs text-slate-500">4 of 6 tasks complete</p></div>
          <div className="rounded-2xl border border-slate-100 p-5"><span className="text-xs font-medium text-slate-500">Team pulse</span><p className="mt-2 text-lg font-semibold tracking-tight">Everyone is aligned</p><div className="mt-5 flex -space-x-2"><span className="grid size-8 place-items-center rounded-full border-2 border-white bg-amber-100 text-xs font-semibold">AM</span><span className="grid size-8 place-items-center rounded-full border-2 border-white bg-sky-100 text-xs font-semibold">JK</span><span className="grid size-8 place-items-center rounded-full border-2 border-white bg-rose-100 text-xs font-semibold">SL</span><span className="grid size-8 place-items-center rounded-full border-2 border-white bg-slate-100 text-xs font-semibold">+3</span></div><p className="mt-2 text-xs text-slate-500">6 people active today</p></div>
        </div>
        <div className="mt-3 rounded-2xl border border-slate-100 p-5"><div className="flex items-center justify-between"><span className="text-sm font-semibold">Upcoming</span><a href="#features" className="text-xs font-medium text-emerald-800">View schedule ↗</a></div><div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-4"><span className="text-xs tabular-nums text-slate-500">10:30</span><span className="size-2 rounded-full bg-emerald-600"/><span className="text-sm text-slate-700">Product planning · Design team</span></div></div>
      </div>
    </section>
  );
}
