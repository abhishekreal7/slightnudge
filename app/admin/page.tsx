'use client';

import { useState, useEffect } from 'react';

export default function AdminDashboardPage() {
  const [adminKey, setAdminKey] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async (key: string) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`/api/admin/metrics?admin_key=${encodeURIComponent(key)}`);
      const json = await resp.json();

      if (!resp.ok) {
        throw new Error(json.error || 'Authentication failed');
      }

      setData(json);
      setIsAuthorized(true);
      sessionStorage.setItem('shipcheck_admin_key', key);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = sessionStorage.getItem('shipcheck_admin_key');
    if (saved) {
      setAdminKey(saved);
      fetchMetrics(saved);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminKey) return;
    fetchMetrics(adminKey);
  };

  if (!isAuthorized) {
    return (
      <div className="py-20 px-4 max-w-sm mx-auto">
        <div className="rounded-md border border-slate-200 bg-white p-6 space-y-4 text-xs">
          <div className="space-y-1">
            <h1 className="text-base font-bold text-slate-900">Admin telemetry</h1>
            <p className="text-slate-500">
              Internal operational metrics and unit economics.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            <div className="space-y-1">
              <label className="block text-slate-700 font-medium">Admin secret key</label>
              <input
                type="password"
                placeholder="Enter ADMIN_SECRET_KEY"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
              />
            </div>

            {error && <p className="text-red-700 font-medium">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded border border-slate-900 bg-slate-900 py-2 font-medium text-white hover:bg-slate-800 transition disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const { summary, runs } = data || {};

  return (
    <div className="py-10 px-4 sm:px-6 max-w-5xl mx-auto space-y-6 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Platform operations & telemetry</h1>
          <p className="text-slate-500 mt-0.5">Real-time unit margins and session execution status</p>
        </div>

        <button
          onClick={() => fetchMetrics(adminKey)}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 transition"
        >
          Refresh metrics
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-md border border-slate-200 bg-white p-4 space-y-1">
          <div className="text-slate-500 font-medium">Gross revenue</div>
          <div className="text-xl font-bold text-slate-900 tabular-nums">
            ${summary?.totalRevenueUsd?.toFixed(2) || '0.00'}
          </div>
          <p className="text-[11px] text-slate-400">{summary?.completedRuns} completed scans</p>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-4 space-y-1">
          <div className="text-slate-500 font-medium">Avg margin / run</div>
          <div className="text-xl font-bold text-slate-900 tabular-nums">
            ${summary?.avgMarginPerRun?.toFixed(2) || '0.00'}
          </div>
          <p className="text-[11px] text-slate-400">Target minimum: $3.00</p>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-4 space-y-1">
          <div className="text-slate-500 font-medium">Compute cost</div>
          <div className="text-xl font-bold text-slate-900 tabular-nums">
            ${summary?.totalComputeCostUsd?.toFixed(2) || '0.00'}
          </div>
          <p className="text-[11px] text-slate-400">{summary?.totalCreditsUsed?.toFixed(2) || 0} credits billed</p>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-4 space-y-1">
          <div className="text-slate-500 font-medium">Failure / refund rate</div>
          <div className="text-xl font-bold text-slate-900 tabular-nums">
            {summary?.failureRatePercent || 0}%
          </div>
          <p className="text-[11px] text-slate-400">{summary?.refundedRuns || 0} auto-refunds triggered</p>
        </div>
      </div>

      {/* Economics Summary */}
      <div className="rounded-md border border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-0.5">
          <span className="font-semibold text-slate-900">Unit economics status:</span>
          <p className="text-slate-600 text-[11px]">
            Price: ${summary?.unitEconomics?.price} | Dodo Fee: ~${summary?.unitEconomics?.dodoFee} | Worst-case cost: ~${summary?.unitEconomics?.worstCaseRunCost} | Net Margin: <strong className="text-slate-900">${summary?.unitEconomics?.netMargin}</strong>
          </p>
        </div>
        <span className="rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-emerald-800 font-semibold text-[11px] self-start sm:self-auto">
          Healthy margin
        </span>
      </div>

      {/* Runs Table */}
      <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 font-semibold text-slate-700">
          Recent scan runs
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 text-[11px]">
              <tr>
                <th className="py-2 px-3">Run ID</th>
                <th className="py-2 px-3">Kind</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Score</th>
                <th className="py-2 px-3">Cost</th>
                <th className="py-2 px-3">Margin</th>
                <th className="py-2 px-3">Sessions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {runs?.map((r: any) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-medium text-slate-900">{r.id}</td>
                  <td className="py-2.5 px-3 uppercase text-[11px] text-slate-600">{r.kind}</td>
                  <td className="py-2.5 px-3">
                    <span className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-800 font-medium">
                      {r.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-semibold tabular-nums">{r.healthScore ?? '—'}</td>
                  <td className="py-2.5 px-3 tabular-nums text-slate-600">${r.costUsd}</td>
                  <td className="py-2.5 px-3 tabular-nums font-medium text-slate-900">
                    {r.kind === 'full' ? `$${r.marginUsd}` : '—'}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                    {r.sessionIds?.length > 0 ? r.sessionIds.join(', ') : 'local'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
