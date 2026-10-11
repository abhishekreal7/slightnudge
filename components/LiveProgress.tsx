'use client';

import { PipelineStageName } from '@/lib/db/types';

interface LiveProgressProps {
  stage: PipelineStageName;
  progress: number;
  status: string;
  error?: string | null;
}

const STAGES: Array<{ id: PipelineStageName; label: string; desc: string }> = [
  { id: 'preflight', label: '1. Site reachability', desc: 'Verifying DNS, SSL, and network accessibility' },
  { id: 'discovery', label: '2. Route mapping', desc: 'Crawling routes, forms, inputs, and interactive actions' },
  { id: 'planning', label: '3. Test generation', desc: 'Planning edge cases, validation attacks, and negative flows' },
  { id: 'execution', label: '4. Browser execution', desc: 'Emulating desktop (1280x800) and mobile (390x844) viewports' },
  { id: 'analysis', label: '5. Evidence analysis', desc: 'Extracting console errors, network 4xx/5xx traces, and logs' },
  { id: 'report', label: '6. Report generation', desc: 'Calculating health score and formatting AI fix prompts' },
];

export function LiveProgress({ stage, progress, status, error }: LiveProgressProps) {
  const currentStageIndex = STAGES.findIndex((s) => s.id === stage);

  return (
    <div className="rounded-md border border-slate-200 bg-white p-6 space-y-6">
      {/* Header & Status */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Scan execution in progress</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cloud Chromium runner executing tests against your web application
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium">
          {status === 'running' && (
            <span className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700">
              <span className="w-2 h-2 rounded-full bg-sky-600 animate-pulse" />
              <span>Running (~2 minutes remaining)</span>
            </span>
          )}
          {status === 'failed' && (
            <span className="inline-flex items-center gap-1.5 rounded border border-red-300 bg-red-50 px-2.5 py-1 text-red-800">
              <span className="w-2 h-2 rounded-full bg-red-600" />
              <span>Execution failed</span>
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar & Numeric Indicator */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-slate-600">
          <span>Overall progress</span>
          <span className="font-mono tabular-nums font-medium">{progress}%</span>
        </div>
        <div className="h-2 w-full rounded bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-slate-800 transition-all duration-300 ease-out"
            style={{ width: `${Math.max(4, progress)}%` }}
          />
        </div>
      </div>

      {/* Stages Stepper */}
      <div className="space-y-3 pt-2">
        {STAGES.map((s, idx) => {
          const isDone = idx < currentStageIndex || status === 'completed';
          const isCurrent = idx === currentStageIndex && status === 'running';

          return (
            <div key={s.id} className="flex items-start gap-3 text-xs">
              <div className="mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 border text-[10px] font-mono">
                {isDone ? (
                  <span className="text-emerald-700 bg-emerald-50 w-full h-full flex items-center justify-center border-emerald-300 rounded">
                    ✓
                  </span>
                ) : isCurrent ? (
                  <span className="text-sky-700 bg-sky-50 w-full h-full flex items-center justify-center border-sky-300 rounded font-bold animate-pulse">
                    &gt;
                  </span>
                ) : (
                  <span className="text-slate-400 bg-slate-50 w-full h-full flex items-center justify-center border-slate-200 rounded">
                    ·
                  </span>
                )}
              </div>

              <div className="flex-1 space-y-0.5">
                <p className={`font-medium ${isCurrent ? 'text-slate-900 font-semibold' : isDone ? 'text-slate-700' : 'text-slate-400'}`}>
                  {s.label}
                </p>
                <p className="text-[11px] text-slate-500">{s.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* User Agency Reassurance Box */}
      <div className="rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
        <p className="font-semibold text-slate-800">
          You can safely close this browser tab
        </p>
        <p className="text-slate-500 leading-relaxed">
          The test runner operates independently in the cloud. Your findings and report link persist permanently at this URL.
        </p>
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-xs text-red-900 space-y-1">
          <p className="font-semibold">Error encountered during execution:</p>
          <p className="text-red-700 font-mono text-[11px]">{error}</p>
        </div>
      )}
    </div>
  );
}
