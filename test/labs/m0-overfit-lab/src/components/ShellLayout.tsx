import React from 'react';

interface ShellLayoutProps {
  children: React.ReactNode;
}

export function ShellLayout({ children }: ShellLayoutProps) {
  return (
    <div id="app-shell" className="min-h-screen bg-slate-50 text-slate-900 antialiased">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <span className="text-xl font-bold tracking-tight text-indigo-600">OverfitLab</span>
          <nav className="flex gap-4">
            <a href="#grid" className="text-sm font-medium text-slate-600 hover:text-slate-900">Grids</a>
            <a href="#feed" className="text-sm font-medium text-slate-600 hover:text-slate-900">Feed</a>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-10">
        {children}
      </main>
    </div>
  );
}
