'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
  label?: string;
  className?: string;
}

export function CodeBlock({ code, label, className = '' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`rounded-md border border-slate-200 bg-white overflow-hidden text-xs ${className}`}>
      {label && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-50 text-slate-700 font-medium">
          <span>{label}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 transition-colors"
            title="Copy code"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      )}
      <div className="relative">
        {!label && (
          <button
            type="button"
            onClick={handleCopy}
            className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 shadow-xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        )}
        <pre className="p-3.5 font-mono text-xs text-slate-900 bg-slate-900/5 overflow-x-auto whitespace-pre-wrap leading-relaxed">
          {code}
        </pre>
      </div>
    </div>
  );
}
