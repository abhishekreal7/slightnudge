'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorBoundary({
  error,
  retry,
  reset,
}: {
  error: unknown;
  retry?: () => void;
  reset?: () => void;
}) {
  useEffect(() => {
    console.error('[SlightNudge App Error]:', error);
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

  const errorMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : 'An unexpected error occurred.';
  const errorDigest = typeof error === 'object' && error !== null && 'digest' in error ? String((error as any).digest) : undefined;

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-8 shadow-xl text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-5">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <h2 className="text-xl font-semibold text-slate-900 dark:text-neutral-100 tracking-tight mb-2">
          Page Error Encountered
        </h2>

        <p className="text-sm text-slate-600 dark:text-neutral-400 leading-relaxed mb-6">
          This page encountered an unexpected rendering error. Your local project data and saved edits are completely safe.
        </p>

        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={handleRetry}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            Try Again
          </button>

          <Link
            href="/workspace"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg border border-slate-300 dark:border-neutral-700 bg-transparent hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-medium text-sm transition-colors"
          >
            Return to Workspace
          </Link>
        </div>

        {(errorMessage || errorDigest) && (
          <details className="mt-8 pt-5 border-t border-slate-100 dark:border-neutral-800 text-left">
            <summary className="text-xs text-slate-400 dark:text-neutral-500 cursor-pointer select-none font-medium hover:text-slate-600 dark:hover:text-neutral-300">
              Technical Details
            </summary>
            <div className="mt-2 p-3 bg-slate-50 dark:bg-neutral-950 rounded-lg text-xs font-mono text-slate-600 dark:text-neutral-400 break-all leading-normal">
              <div>{errorMessage}</div>
              {errorDigest && <div className="mt-1 text-slate-400 dark:text-neutral-600">Digest: {errorDigest}</div>}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
