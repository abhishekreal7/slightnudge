'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ScanItem {
  id: string;
  url: string;
  kind: 'preview' | 'full';
  status: string;
  health_score: number | null;
  created_at: string;
  findingsCount?: number;
}

export default function DashboardPage() {
  const [scans, setScans] = useState<ScanItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // For demo/audit consistency, provide initial demo entry or check localStorage/API
    const initialList: ScanItem[] = [
      {
        id: 'run_sample_benchmark',
        url: 'http://localhost:3100',
        kind: 'preview',
        status: 'completed',
        health_score: 20,
        created_at: '2026-10-10T08:30:00Z',
        findingsCount: 4,
      },
    ];
    setScans(initialList);
    setLoading(false);
  }, []);

  return (
    <div className="py-12 px-4 sm:px-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My scans</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified web apps and recorded QA test runs
          </p>
        </div>

        <Link
          href="/new"
          className="rounded border border-slate-900 bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition"
        >
          New scan
        </Link>
      </div>

      {loading ? (
        <div className="h-40 rounded border border-slate-200 bg-white animate-pulse" />
      ) : scans.length === 0 ? (
        <div className="rounded-md border border-slate-200 bg-white p-12 text-center text-xs space-y-3">
          <p className="font-semibold text-slate-900">No scans recorded yet</p>
          <p className="text-slate-500 max-w-sm mx-auto">
            Run an automated browser test on your web app to discover edge-case bugs and mobile layout issues.
          </p>
          <div>
            <Link
              href="/new"
              className="inline-flex rounded border border-slate-900 bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-800 transition"
            >
              Run your first scan
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-slate-200 bg-white overflow-hidden text-xs">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 font-semibold text-slate-700">
            Recorded scan runs
          </div>

          <div className="divide-y divide-slate-100">
            {scans.map((scan) => (
              <div
                key={scan.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">
                      {scan.url}
                    </span>
                    <span className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.2 text-[11px] font-mono text-slate-600">
                      {scan.id}
                    </span>
                    <span className="rounded px-1.5 py-0.2 text-[11px] uppercase font-medium bg-amber-50 text-amber-800 border border-amber-200">
                      {scan.kind}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-slate-500 text-[11px] tabular-nums">
                    <span>
                      Health score: <strong className="text-slate-800">{scan.health_score ?? 'N/A'}/100</strong>
                    </span>
                    <span>
                      Findings: <strong className="text-slate-800">{scan.findingsCount ?? 0}</strong>
                    </span>
                    <span>Status: {scan.status}</span>
                  </div>
                </div>

                <Link
                  href={`/runs/${scan.id}`}
                  className="rounded border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 transition text-center shrink-0"
                >
                  View report
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
