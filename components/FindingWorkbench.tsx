'use client';

import { useState, useEffect } from 'react';
import { FindingRecord, FindingSeverity } from '@/lib/db/types';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { Terminal, Activity, Check, Copy, Lock, Smartphone, Monitor } from 'lucide-react';

interface FindingWorkbenchProps {
  findings: FindingRecord[];
  isPreview: boolean;
  onUnlock?: () => void;
}

export function FindingWorkbench({ findings, isPreview, onUnlock }: FindingWorkbenchProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [promptCopied, setPromptCopied] = useState(false);

  // Sync with URL hash if present
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashId = window.location.hash.replace('#', '');
      const foundIdx = findings.findIndex((f) => f.id === hashId);
      if (foundIdx !== -1) {
        setSelectedIndex(foundIdx);
      }
    }
  }, [findings]);

  // Keyboard navigation: J (down), K (up), C (copy prompt)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < findings.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'c' || e.key === 'C') {
        const active = findings[selectedIndex];
        if (active?.fix_prompt && !(isPreview && selectedIndex > 0)) {
          e.preventDefault();
          navigator.clipboard.writeText(active.fix_prompt);
          setPromptCopied(true);
          setTimeout(() => setPromptCopied(false), 2000);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [findings, selectedIndex, isPreview]);

  if (findings.length === 0) {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
        <p className="font-semibold text-slate-900">No defects found</p>
        <p className="mt-1 text-slate-500">All automated desktop and mobile test flows completed cleanly.</p>
      </div>
    );
  }

  const selectedFinding = findings[selectedIndex] || findings[0];
  const isSelectedLocked = isPreview && selectedIndex > 0;
  const { stepsToReproduce, expected, actual, likelyCause, evidence } = selectedFinding.body_json || {};

  const handleSelectFinding = (idx: number, id: string) => {
    setSelectedIndex(idx);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${id}`);
    }
  };

  const handleCopyPrompt = async () => {
    if (!selectedFinding.fix_prompt) return;
    await navigator.clipboard.writeText(selectedFinding.fix_prompt);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  };

  return (
    <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
      {/* Workbench Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800">Findings workbench</span>
          <span className="text-slate-400">({findings.length} total)</span>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-slate-400">
          <span>
            Navigate: <kbd className="rounded border border-slate-300 bg-white px-1 font-mono text-[10px]">J</kbd> / <kbd className="rounded border border-slate-300 bg-white px-1 font-mono text-[10px]">K</kbd>
          </span>
          <span>
            Copy prompt: <kbd className="rounded border border-slate-300 bg-white px-1 font-mono text-[10px]">C</kbd>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[520px]">
        {/* Left Rail: Scannable Finding List */}
        <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/40 overflow-y-auto max-h-[600px] divide-y divide-slate-100">
          {findings.map((f, idx) => {
            const isSelected = idx === selectedIndex;
            const isLocked = isPreview && idx > 0;

            return (
              <button
                key={f.id || idx}
                type="button"
                onClick={() => handleSelectFinding(idx, f.id)}
                className={`w-full text-left p-3.5 transition-colors flex flex-col gap-1.5 ${
                  isSelected
                    ? 'bg-white border-l-2 border-slate-900 shadow-xs'
                    : 'hover:bg-slate-100/70 border-l-2 border-transparent'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <SeverityBadge severity={f.severity} />
                  {isLocked ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      <Lock className="w-2.5 h-2.5" />
                      <span>Preview lock</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500 font-mono">
                      {f.category}
                    </span>
                  )}
                </div>

                <div className="font-medium text-xs text-slate-900 line-clamp-2">
                  {isLocked ? `Locked Finding #${idx + 1}` : f.title}
                </div>

                <div className="text-[11px] text-slate-400 truncate">
                  {f.id}
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Rail: Deep Inspection & Fix Prompt */}
        <div className="lg:col-span-8 p-6 overflow-y-auto max-h-[680px] space-y-6">
          {isSelectedLocked ? (
            <div className="py-12 px-4 text-center max-w-md mx-auto space-y-4">
              <div className="w-10 h-10 rounded border border-amber-300 bg-amber-50 text-amber-800 flex items-center justify-center mx-auto">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Finding Locked in Free Preview
                </h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  This issue was confirmed during testing. Unlock the full report to access exact steps to reproduce, full console traces, network logs, and the ready-to-paste AI fix prompt.
                </p>
              </div>
              {onUnlock && (
                <button
                  type="button"
                  onClick={onUnlock}
                  className="rounded border border-slate-900 bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition shadow-xs"
                >
                  Unlock full report ($9.99)
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Finding Title & Meta */}
              <div className="space-y-2 border-b border-slate-100 pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={selectedFinding.severity} />
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700 font-medium">
                    Category: {selectedFinding.category}
                  </span>
                  <span className="text-xs text-slate-500">
                    Confidence: <strong className="text-slate-800 font-medium capitalize">{selectedFinding.confidence}</strong>
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  {selectedFinding.title}
                </h2>
              </div>

              {/* Steps to Reproduce */}
              {stepsToReproduce && stepsToReproduce.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                    Steps to reproduce
                  </h3>
                  <ol className="list-decimal pl-5 space-y-1.5 text-xs text-slate-700">
                    {stepsToReproduce.map((step, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Expected vs Actual */}
              {(expected || actual) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="rounded border border-slate-200 bg-slate-50 p-3 space-y-1">
                    <span className="font-semibold text-slate-600 uppercase text-[11px]">
                      Expected behavior
                    </span>
                    <p className="text-slate-800 leading-relaxed">
                      {expected || 'Clean user flow completion.'}
                    </p>
                  </div>
                  <div className="rounded border border-red-200 bg-red-50/50 p-3 space-y-1">
                    <span className="font-semibold text-red-800 uppercase text-[11px]">
                      Actual behavior
                    </span>
                    <p className="text-red-950 font-medium leading-relaxed">
                      {actual || 'Flow encountered defect.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Likely Root Cause */}
              {likelyCause && (
                <div className="rounded border border-slate-200 bg-slate-50 p-3 text-xs space-y-1">
                  <span className="font-semibold text-slate-700">
                    Suspected root cause
                  </span>
                  <p className="text-slate-600 leading-relaxed">
                    {likelyCause}
                  </p>
                </div>
              )}

              {/* Technical Evidence: Console & Network */}
              {evidence && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                    Technical evidence
                  </h3>

                  {evidence.consoleLines && evidence.consoleLines.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                        <Terminal className="w-3.5 h-3.5" />
                        <span>Console output</span>
                      </div>
                      <CodeBlock
                        code={evidence.consoleLines.join('\n')}
                        language="text"
                      />
                    </div>
                  )}

                  {evidence.networkEntries && evidence.networkEntries.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                        <Activity className="w-3.5 h-3.5" />
                        <span>Failed network requests</span>
                      </div>
                      <div className="rounded border border-slate-200 bg-white divide-y divide-slate-100 font-mono text-xs">
                        {evidence.networkEntries.map((net, i) => (
                          <div key={i} className="p-2.5 flex items-center justify-between gap-2">
                            <span className="text-red-700 font-semibold shrink-0">
                              HTTP {net.status || 'FAILED'}
                            </span>
                            <span className="text-slate-700 truncate text-[11px]">
                              {net.url}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Ready-to-paste AI Fix Prompt */}
              {selectedFinding.fix_prompt && (
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                        Ready-to-paste fix prompt
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Engineered for Cursor, Claude Code, and Lovable
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyPrompt}
                      className="inline-flex items-center gap-1.5 rounded border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition shadow-xs"
                    >
                      {promptCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied prompt</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy fix prompt</span>
                        </>
                      )}
                    </button>
                  </div>

                  <CodeBlock
                    code={selectedFinding.fix_prompt}
                    language="markdown"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
