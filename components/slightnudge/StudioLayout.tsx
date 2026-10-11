'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function StudioLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const navItems = [
    { id: '1', title: '1. Plain Static', path: '/fixtures/1', file: 'fixtures/1-plain-static.tsx' },
    { id: '2', title: '2. Multi-Utility', path: '/fixtures/2', file: 'fixtures/2-several-utilities.tsx' },
    { id: '3', title: '3. Conditional cn()', path: '/fixtures/3', file: 'fixtures/3-conditional-cn.tsx' },
    { id: '4', title: '4. Shared Component', path: '/fixtures/4', file: 'fixtures/4-shared-component.tsx' },
    { id: '5', title: '5. Responsive', path: '/fixtures/5', file: 'fixtures/5-responsive-classes.tsx' },
  ];

  const viewportWidth =
    viewport === 'mobile' ? 'max-w-[390px]' :
    viewport === 'tablet' ? 'max-w-[768px]' : 'max-w-[1100px]';

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Studio Control Bar */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 flex items-center justify-between z-40 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-indigo-500 animate-pulse" />
            <span className="font-extrabold text-sm tracking-wider text-white">slightnudge</span>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded font-mono font-medium">
              studio
            </span>
          </div>

          <span className="text-slate-700">|</span>

          {/* Project / Target Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
            <span>Target:</span>
            <span className="font-semibold text-slate-200">Customer SaaS App</span>
            <span className="text-slate-600 font-mono text-[11px]">(Next.js 16 + Tailwind)</span>
          </div>
        </div>

        {/* Page / Fixture Switcher Tabs */}
        <nav className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-lg">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.id}
                href={item.path}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {item.title}
              </Link>
            );
          })}
        </nav>

        {/* Viewport & Actions Controls */}
        <div className="flex items-center gap-2">
          {/* Viewport Switcher */}
          <div className="hidden md:flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setViewport('desktop')}
              className={`px-2 py-1 rounded transition ${
                viewport === 'desktop' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Desktop
            </button>
            <button
              onClick={() => setViewport('tablet')}
              className={`px-2 py-1 rounded transition ${
                viewport === 'tablet' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tablet
            </button>
            <button
              onClick={() => setViewport('mobile')}
              className={`px-2 py-1 rounded transition ${
                viewport === 'mobile' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Mobile
            </button>
          </div>

          {/* Git Branch Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/60 border border-emerald-700/50 rounded-md text-[11px] text-emerald-300 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>git: slightnudge</span>
          </div>
        </div>
      </header>

      {/* Main Studio Canvas Area */}
      <div className="flex-1 flex overflow-hidden relative bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] bg-slate-950">
        {/* Central Workspace / Framed Preview Window */}
        <main className="flex-1 overflow-auto p-6 md:p-10 flex flex-col items-center justify-start">
          <div className={`w-full ${viewportWidth} transition-all duration-200 rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden`}>
            {/* macOS Chrome Browser Title Bar */}
            <div className="h-9 bg-slate-900/90 border-b border-slate-800/80 px-3 flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <div className="mx-auto flex-1 max-w-sm px-3 py-0.5 bg-slate-950/80 border border-slate-800/80 rounded-md text-[11px] text-slate-400 font-mono text-center truncate">
                https://app.customer-saas.com{pathname}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">100%</div>
            </div>

            {/* Target Webpage Canvas Container */}
            <div id="slightnudge-canvas-viewport" className="p-6 md:p-8 bg-slate-950/50 min-h-[480px]">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
