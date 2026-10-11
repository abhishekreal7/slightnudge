import { FindingSeverity } from '@/lib/db/types';

interface SeverityBadgeProps {
  severity: FindingSeverity;
  className?: string;
}

export function SeverityBadge({ severity, className = '' }: SeverityBadgeProps) {
  switch (severity) {
    case 'critical':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded border border-red-300 bg-red-50 text-red-800 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" aria-hidden="true" />
          <span className="sr-only">Severity: </span>
          <span>CRITICAL</span>
        </span>
      );
    case 'high':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded border border-orange-300 bg-orange-50 text-orange-900 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-sm bg-orange-600 shrink-0" aria-hidden="true" />
          <span className="sr-only">Severity: </span>
          <span>HIGH</span>
        </span>
      );
    case 'medium':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded border border-amber-300 bg-amber-50 text-amber-900 ${className}`}
        >
          <span className="w-1.5 h-1.5 rotate-45 bg-amber-600 shrink-0" aria-hidden="true" />
          <span className="sr-only">Severity: </span>
          <span>MEDIUM</span>
        </span>
      );
    case 'low':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded border border-slate-300 bg-slate-100 text-slate-700 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full border border-slate-500 shrink-0" aria-hidden="true" />
          <span className="sr-only">Severity: </span>
          <span>LOW</span>
        </span>
      );
  }
}
