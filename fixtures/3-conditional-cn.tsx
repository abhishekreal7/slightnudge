'use client';

import clsx, { type ClassValue } from 'clsx';

function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export default function ConditionalCnPage({ isActive = false }: { isActive?: boolean }) {
  return (
    <div className="p-8">
      <h1 className="text-xl font-bold mb-4">Fixture 3: Conditional cn()</h1>
      <div
        id="target"
        className={cn('ml-2 p-4 text-white rounded', isActive && 'bg-emerald-600', !isActive && 'bg-slate-700')}
      >
        Conditional Element
      </div>
    </div>
  );
}
