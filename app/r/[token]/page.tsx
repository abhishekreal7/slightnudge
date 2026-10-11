import Link from 'next/link';

export default async function SharedReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div className="py-12 px-4 sm:px-6 max-w-5xl mx-auto space-y-6 text-xs">
      <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
        <div>
          <span className="rounded border border-slate-300 bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
            Public audit report
          </span>
          <h1 className="text-xl font-bold text-slate-900 mt-2">
            ShipCheck automated verification
          </h1>
          <p className="text-slate-500 font-mono text-[11px] mt-0.5">
            Share token: {token}
          </p>
        </div>

        <Link
          href="/"
          className="rounded border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 transition"
        >
          Run scan on your site
        </Link>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-5 space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-slate-500 font-semibold uppercase text-[11px]">
            Application health score:
          </span>
          <span className="text-2xl font-bold text-slate-900 tabular-nums">85</span>
          <span className="text-slate-400">/ 100</span>
        </div>
        <p className="text-slate-600 leading-relaxed">
          Verified by ShipCheck cloud Chromium runner across desktop (1280x800) and mobile (390x844) viewports.
        </p>
      </div>
    </div>
  );
}
