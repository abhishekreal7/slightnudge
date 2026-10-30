'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Share2, Download, Lock, Check } from 'lucide-react';
import { LiveProgress } from '@/components/LiveProgress';
import { FindingWorkbench } from '@/components/FindingWorkbench';
import { FindingRecord, PipelineStageName } from '@/lib/db/types';
import { trackFunnelEvent } from '@/lib/analytics/events';
import { accountFetch } from '@/lib/auth/browser';
import Link from 'next/link';

interface RunDetailData {
  run: {
    id: string;
    kind: 'preview' | 'full';
    status: string;
    stage: PipelineStageName;
    progress: number;
    notes: string | null;
    health_score: number | null;
    started_at: string | null;
    finished_at: string | null;
    error: string | null;
  };
  scenariosCount: number;
  findings: FindingRecord[];
  totalFindingsCount: number;
  lockedCount: number;
}

export default function RunDetailPage() {
  const params = useParams();
  const runId = params.id as string;

  const [data, setData] = useState<RunDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [actionError, setActionError] = useState('');
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const previewTrackedRef = useRef(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchStatus = async () => {
      try {
        const resp = await accountFetch(`/api/runs/${runId}`);
        if (!resp.ok) {
          throw new Error(resp.status === 401 ? 'Sign in to view your scan.' : resp.status === 404 ? 'Scan not found' : 'Could not load this scan. Try again.');
        }
        const json = await resp.json();
        setData(json);

        // Terminate polling on terminal states
        if (json.run.status === 'completed' || json.run.status === 'failed' || json.run.status === 'partial') {
          clearInterval(interval);
          if (!previewTrackedRef.current) {
            previewTrackedRef.current = true;
            trackFunnelEvent('preview_viewed', {
              runId: json.run.id,
              kind: json.run.kind,
              healthScore: json.run.health_score,
              totalFindings: json.totalFindingsCount,
            });
          }
        }
      } catch (err: any) {
        setError(err.message);
        clearInterval(interval);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    interval = setInterval(fetchStatus, 2000);

    return () => clearInterval(interval);
  }, [runId]);

  if (loading && !data) {
    return (
      <div className="py-12 px-4 sm:px-6 max-w-5xl mx-auto space-y-6">
        <div className="h-8 w-48 rounded bg-slate-200 animate-pulse" />
        <div className="h-28 rounded-md border border-slate-200 bg-white p-6 animate-pulse" />
        <div className="h-96 rounded-md border border-slate-200 bg-white p-6 animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-16 max-w-lg mx-auto text-center px-4">
        <div className="rounded-md border border-red-200 bg-red-50 p-6 text-red-900 text-left space-y-2">
          <h2 className="text-sm font-semibold">Unable to load scan</h2>
          <p className="text-xs text-red-700 leading-relaxed">{error || 'Scan does not exist or has expired.'}</p>
          {error?.includes('Sign in') && <Link href={`/login?next=${encodeURIComponent(`/runs/${runId}`)}`} className="text-xs underline">Sign in</Link>}
        </div>
      </div>
    );
  }

  const { run, findings, lockedCount, totalFindingsCount } = data;
  const isRunning = run.status === 'queued' || run.status === 'running';

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const handleUnlockPayment = async () => {
    if (checkoutBusy) return; setCheckoutBusy(true); setActionError('');
    try {
      trackFunnelEvent('checkout_started', { runId });
      const resp = await accountFetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId }),
      });
      const res = await resp.json();
      if (!resp.ok || !res.checkoutUrl) throw new Error(res.error || 'Could not open checkout. Try again.');
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      }
    } catch (e: any) {
      setActionError(e.message || 'Could not open checkout. Try again.');
    } finally { setCheckoutBusy(false); }
  };
  const exportReport = async () => {
    setActionError('');
    try { const response = await accountFetch(`/api/runs/${run.id}/report.pdf`); if (!response.ok) { const value = await response.json(); throw new Error(value.error || 'Could not export this report.'); } const url = URL.createObjectURL(await response.blob()); const link = document.createElement('a'); link.href = url; link.download = `slightnudge-report-${run.id}.html`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Could not export this report.'); }
  };

  // Compute severity counts
  const criticalCount = findings.filter((f) => f.severity === 'critical').length;
  const highCount = findings.filter((f) => f.severity === 'high').length;
  const mediumCount = findings.filter((f) => f.severity === 'medium').length;
  const lowCount = findings.filter((f) => f.severity === 'low').length;

  return (
    <div className="py-10 px-4 sm:px-6 max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900">Scan report</h1>
            <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-700">
              {run.id}
            </span>
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium uppercase tracking-wide border ${
                run.kind === 'preview'
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-slate-300 bg-slate-100 text-slate-800'
              }`}
            >
              {run.kind}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Cloud Chromium automated verification pass (Desktop 1280x800 & Mobile 390x844)
          </p>
        </div>

        {/* Share & Export Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={copyShareLink}
            className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            {shareCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Link copied</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Share link</span>
              </>
            )}
          </button>

          <button type="button"
            onClick={exportReport} disabled={run.kind !== 'full'}
            className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export printable report</span>
          </button>
        </div>
      </div>

      {actionError && <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">{actionError}</p>}
      {/* Live Stage Progress Indicator (when running) */}
      {isRunning && (
        <LiveProgress
          stage={run.stage}
          progress={run.progress}
          status={run.status}
          error={run.error}
        />
      )}

      {/* Summary Scorecard (when finished) */}
      {!isRunning && (
        <div className="rounded-md border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
                  Application health score:
                </span>
                <span className="text-2xl font-bold text-slate-900 tabular-nums">
                  {run.health_score ?? 100}
                </span>
                <span className="text-xs text-slate-400">/ 100</span>
              </div>
              <p className="text-xs text-slate-600">
                {totalFindingsCount === 0
                  ? 'All automated test flows passed without errors.'
                  : `${totalFindingsCount} confirmed issues identified across desktop and mobile flows.`}
              </p>
            </div>

            {/* Severity Counters */}
            <div className="flex items-center gap-2 text-xs tabular-nums">
              <span className="rounded border border-red-300 bg-red-50 px-2 py-1 font-medium text-red-900">
                {criticalCount} critical
              </span>
              <span className="rounded border border-orange-300 bg-orange-50 px-2 py-1 font-medium text-orange-900">
                {highCount} high
              </span>
              <span className="rounded border border-amber-300 bg-amber-50 px-2 py-1 font-medium text-amber-900">
                {mediumCount} medium
              </span>
              <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 font-medium text-slate-700">
                {lowCount} low
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Preview Upsell Banner (when preview) */}
      {run.kind === 'preview' && !isRunning && (
        <div className="rounded-md border border-amber-200 bg-amber-50/60 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h2 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-700" />
              <span>Preview scan active</span>
            </h2>
            <p className="text-xs text-amber-900 leading-relaxed max-w-xl">
              1 sample bug is unlocked below with full steps, traces, and fix prompt. {lockedCount} additional confirmed defects are locked. Unlock the full deep scan for $9.99 (one-time payment).
            </p>
          </div>

          <button
            type="button"
            onClick={handleUnlockPayment}
            disabled={checkoutBusy}
            className="rounded border border-slate-900 bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition shadow-xs shrink-0"
          >
            {checkoutBusy ? 'Opening checkout…' : 'Unlock full report ($9.99)'}
          </button>
        </div>
      )}

      {/* Main Findings Workbench */}
      {!isRunning && (
        <FindingWorkbench
          findings={findings}
          isPreview={run.kind === 'preview'}
          onUnlock={handleUnlockPayment}
        />
      )}
    </div>
  );
}
