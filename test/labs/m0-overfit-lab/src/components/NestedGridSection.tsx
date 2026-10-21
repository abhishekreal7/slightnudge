import React from 'react';

interface GridSectionProps {
  sectionTitle: string;
  badgeLabel: string;
}

export function NestedGridSection({ sectionTitle, badgeLabel }: GridSectionProps) {
  return (
    <section id="nested-grid-section" className="mb-16 rounded-3xl bg-white p-8 border border-slate-200">
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{badgeLabel}</span>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">{sectionTitle}</h2>
      </div>

      {/* Outer grid */}
      <div id="outer-grid" className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4 rounded-2xl bg-slate-50 p-6 border border-slate-100">
          <h3 className="text-base font-semibold text-slate-800">Sidebar Overview</h3>
          <p className="mt-2 text-sm text-slate-500">Summary metrics for nested layout test.</p>
        </div>

        {/* Inner grid inside outer grid */}
        <div id="inner-grid" className="lg:col-span-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Fragment grouping items */}
          <>
            <div className="rounded-xl border border-slate-200 p-5">
              <h4 className="font-medium text-slate-900">Cell Alpha</h4>
              <p className="mt-1 text-sm text-slate-500">First nested child item.</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-5">
              <h4 className="font-medium text-slate-900">Cell Beta</h4>
              <p className="mt-1 text-sm text-slate-500">Second nested child item.</p>
            </div>
          </>
        </div>
      </div>
    </section>
  );
}
