'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

export default function EditorErrorBoundary({
  error,
  retry,
  reset,
}: {
  error: unknown;
  retry?: () => void;
  reset?: () => void;
}) {
  useEffect(() => {
    console.error('[SlightNudge Editor Error]:', error);
  }, [error]);

  const handleRetry = () => {
    if (typeof retry === 'function') {
      retry();
    } else if (typeof reset === 'function') {
      reset();
    } else {
      window.location.reload();
    }
  };

  const handleClearDraftAndReload = () => {
    try {
      if (typeof window !== 'undefined') {
        // Clear transient in-flight draft keys without wiping preview-session
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i);
          if (key && (key.startsWith('slightnudge:draft') || key.startsWith('slightnudge:in-flight') || key.startsWith('slightnudge:pending'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(k => window.sessionStorage.removeItem(k));
      }
    } catch {}
    window.location.reload();
  };

  const errorMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : 'An unexpected editor error occurred.';
  const errorDigest = typeof error === 'object' && error !== null && 'digest' in error ? String((error as any).digest) : undefined;

  return (
    <div className="fixed inset-0 z-50 bg-[#090d0b] text-[#e2ece5] flex items-center justify-center p-6 select-none">
      <div className="max-w-lg w-full bg-[#111714] border border-[#1e2722] rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4" />
              <path d="m4.93 4.93 2.83 2.83" />
              <path d="M2 12h4" />
              <path d="m4.93 19.07 2.83-2.83" />
              <path d="M12 22v-4" />
              <path d="m19.07 19.07-2.83-2.83" />
              <path d="M22 12h-4" />
              <path d="m19.07 4.93-2.83 2.83" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-neutral-100">
              Visual Editor Interrupted
            </h2>
            <p className="text-xs text-[#7e8f85]">
              Disk files and saved history are safe
            </p>
          </div>
        </div>

        <p className="text-sm text-[#9eb0a5] leading-relaxed mb-6">
          The visual workspace encountered an unexpected rendering error. Your source files on disk remain completely unmodified, and all previously saved history records are intact.
        </p>

        <div className="flex flex-col gap-2.5">
          <div className="flex gap-3">
            <button
              onClick={handleRetry}
              className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-semibold text-sm transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              Reload Canvas
            </button>

            <button
              onClick={handleClearDraftAndReload}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg border border-[#26322b] bg-[#161e1a] hover:bg-[#1d2722] text-[#c5d3cb] font-medium text-sm transition-colors"
            >
              Clear Draft & Reopen
            </button>
          </div>

          <Link
            href="/workspace"
            className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-xs text-[#78887e] hover:text-[#b4c3b9] hover:bg-[#141b17] transition-colors"
          >
            ← Return to Workspace
          </Link>
        </div>

        {(errorMessage || errorDigest) && (
          <details className="mt-6 pt-4 border-t border-[#1a221d] text-left">
            <summary className="text-xs text-[#637268] hover:text-[#94a59a] cursor-pointer font-medium select-none">
              Diagnostics
            </summary>
            <div className="mt-2.5 p-3 bg-[#0a0e0c] border border-[#17201a] rounded-lg text-xs font-mono text-[#8fa196] break-all leading-normal">
              <div>{errorMessage}</div>
              {errorDigest && <div className="mt-1 text-[#4e5c53]">Digest: {errorDigest}</div>}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
