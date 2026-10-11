'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Terminal,
  Activity,
  Smartphone,
  Eye,
  Shield,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { FindingRecord, FindingSeverity } from '@/lib/db/types';

interface FindingCardProps {
  finding: FindingRecord;
  isBlurred?: boolean;
}

export function FindingCard({ finding, isBlurred = false }: FindingCardProps) {
  const [copied, setCopied] = useState(false);

  const copyPrompt = async () => {
    if (!finding.fix_prompt) return;
    await navigator.clipboard.writeText(finding.fix_prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSeverityBadge = (severity: FindingSeverity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'low':
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  if (isBlurred) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="filter blur-sm select-none opacity-50">
          <div className="flex items-center space-x-2">
            <span className="h-5 w-16 rounded bg-slate-300"></span>
            <span className="h-5 w-24 rounded bg-slate-200"></span>
          </div>
          <div className="mt-3 h-6 w-3/4 rounded bg-slate-300"></div>
          <div className="mt-4 space-y-2">
            <div className="h-4 w-full rounded bg-slate-100"></div>
            <div className="h-4 w-5/6 rounded bg-slate-100"></div>
          </div>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 p-4 text-center backdrop-blur-[2px]">
          <p className="font-semibold text-slate-800">Locked Finding</p>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            Unlock the full scan report to reveal exact steps, console logs, screenshots, and ready-to-paste AI fix prompts.
          </p>
        </div>
      </div>
    );
  }

  const { stepsToReproduce, expected, actual, likelyCause, evidence } = finding.body_json || {};

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      {/* Top Header */}
      <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <span
              className={`rounded-md border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${getSeverityBadge(
                finding.severity
              )}`}
            >
              {finding.severity}
            </span>
            <span className="rounded bg-slate-200/60 px-2 py-0.5 text-xs font-medium text-slate-600">
              {finding.category}
            </span>
            <span className="text-xs text-slate-400">
              Confidence: <strong className="text-slate-600 capitalize">{finding.confidence}</strong>
            </span>
          </div>

          <span className="text-xs font-mono text-slate-400">{finding.id}</span>
        </div>

        <h3 className="mt-2 text-lg font-bold text-slate-900">{finding.title}</h3>
      </div>

      {/* Main Body */}
      <div className="p-6 space-y-5 text-sm text-slate-700">
        {/* Steps to Reproduce */}
        {stepsToReproduce && stepsToReproduce.length > 0 && (
          <div>
            <h4 className="font-semibold text-slate-900 mb-2 flex items-center space-x-1.5">
              <span>Steps to Reproduce</span>
            </h4>
            <ol className="list-decimal pl-5 space-y-1 text-slate-600">
              {stepsToReproduce.map((step, idx) => (
                <li key={idx} className="leading-relaxed">
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Expected vs Actual */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg bg-slate-50 p-3.5 border border-slate-100">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Expected</p>
            <p className="mt-1 text-slate-800 text-xs leading-relaxed">{expected || 'None specified'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Actual</p>
            <p className="mt-1 text-red-700 font-medium text-xs leading-relaxed">{actual || 'None specified'}</p>
          </div>
        </div>

        {/* Likely Cause Hypothesis */}
        {likelyCause && (
          <div className="rounded-lg bg-blue-50/50 p-3.5 border border-blue-100 text-xs">
            <p className="font-semibold text-blue-900 mb-0.5">Suspected Root Cause (Hypothesis)</p>
            <p className="text-blue-800">{likelyCause}</p>
          </div>
        )}

        {/* Evidence */}
        {evidence && (
          <div className="space-y-3">
            {evidence.consoleLines && evidence.consoleLines.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1 flex items-center space-x-1">
                  <Terminal className="h-3.5 w-3.5" />
                  <span>Console Log Evidence</span>
                </p>
                <div className="rounded-md bg-slate-950 p-3 font-mono text-xs text-red-400 overflow-x-auto">
                  {evidence.consoleLines.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              </div>
            )}

            {evidence.networkEntries && evidence.networkEntries.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1 flex items-center space-x-1">
                  <Activity className="h-3.5 w-3.5" />
                  <span>Network Request Failures</span>
                </p>
                <div className="rounded-md bg-slate-900 p-2.5 font-mono text-xs text-slate-200 space-y-1">
                  {evidence.networkEntries.map((net, i) => (
                    <div key={i} className="flex items-center space-x-2">
                      <span className="rounded bg-red-900/80 px-1.5 py-0.5 text-[10px] text-red-200">
                        HTTP {net.status || 'FAILED'}
                      </span>
                      <span className="text-slate-300 truncate">{net.url}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ready-to-paste AI Fix Prompt */}
        {finding.fix_prompt && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center space-x-1.5">
                <Terminal className="h-3.5 w-3.5" />
                <span>Ready-To-Paste AI Fix Prompt (Cursor / Claude / Lovable)</span>
              </span>
              <button
                onClick={copyPrompt}
                className="flex items-center space-x-1.5 rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Fix Prompt'}</span>
              </button>
            </div>
            <pre className="rounded-lg bg-slate-900 p-4 font-mono text-xs text-slate-100 whitespace-pre-wrap leading-relaxed overflow-x-auto border border-slate-800">
              {finding.fix_prompt}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
