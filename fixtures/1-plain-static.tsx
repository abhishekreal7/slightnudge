'use client';

import React from 'react';
import {
  Sparkles,
  ArrowRight,
  Play,
  CheckCircle2,
  Layers,
  Zap,
  ShieldCheck,
  Code2,
  Cpu,
  Star,
  Activity,
  Terminal,
  ChevronRight,
  Monitor,
  Smartphone,
  Tablet,
} from 'lucide-react';

export default function PlainStaticPage() {
  return (
    <main className="min-h-screen bg-[#FAFAFA] dark:bg-[#070B14] text-slate-900 dark:text-slate-100 font-sans selection:bg-emerald-500/20 selection:text-emerald-900 dark:selection:bg-emerald-500/30 dark:selection:text-emerald-300 relative overflow-hidden transition-colors duration-200">
      {/* Background Ambient Mesh Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-gradient-to-b from-emerald-500/10 via-teal-500/5 to-transparent dark:from-emerald-500/15 dark:via-teal-500/8 blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-[600px] right-[-200px] w-[500px] h-[500px] bg-gradient-to-br from-indigo-500/5 dark:from-indigo-500/10 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-[1200px] left-[-200px] w-[600px] h-[600px] bg-gradient-to-tr from-emerald-500/5 dark:from-emerald-500/10 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* =================================================================== */}
      {/* 1. FLOATING LIQUID GLASS NAVBAR                                     */}
      {/* =================================================================== */}
      <header className="sticky top-4 z-40 max-w-6xl mx-auto px-4 sm:px-6">
        <nav
          id="navigation"
          className="bg-white/85 dark:bg-slate-900/65 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-2xl px-5 py-3.5 flex items-center justify-between shadow-lg shadow-slate-200/50 dark:shadow-2xl dark:shadow-black/50 transition-colors"
        >
          {/* Brand Logo */}
          <a href="#overview" className="flex items-center gap-2.5 group cursor-pointer">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-emerald-500/20 group-hover:scale-105 transition">
              <Zap size={17} className="fill-slate-950 text-slate-950" />
            </div>
            <span className="font-semibold text-base text-slate-950 dark:text-white tracking-tight">Apex Studio</span>
            <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
              v2.4
            </span>
          </a>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-7 text-xs font-medium text-slate-600 dark:text-slate-400">
            <a href="#features" className="hover:text-slate-950 dark:hover:text-white transition cursor-pointer">
              Features
            </a>
            <a href="#showcase" className="hover:text-slate-950 dark:hover:text-white transition cursor-pointer">
              Showcase
            </a>
            <a href="#engine" className="hover:text-slate-950 dark:hover:text-white transition cursor-pointer">
              Engine
            </a>
            <a href="#metrics" className="hover:text-slate-950 dark:hover:text-white transition cursor-pointer">
              Metrics
            </a>
            <a href="#pricing" className="hover:text-slate-950 dark:hover:text-white transition cursor-pointer">
              Pricing
            </a>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <a
              href="#login"
              className="hidden sm:inline-block text-xs font-medium text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white transition cursor-pointer px-2 py-1"
            >
              Sign in
            </a>
            <a
              href="#start"
              data-source-file="fixtures/1-plain-static.tsx"
              data-source-line="79"
              data-source-column="13"
              className="inline-flex items-center gap-1.5 bg-slate-950 hover:bg-slate-800 !text-white dark:bg-white dark:hover:bg-slate-100 dark:!text-slate-950 text-xs font-semibold px-4 py-2 rounded-xl transition shadow-sm cursor-pointer"
            >
              Get Started <ArrowRight size={13} />
            </a>
          </div>
        </nav>
      </header>

      {/* =================================================================== */}
      {/* 2. HERO SECTION                                                     */}
      {/* =================================================================== */}
      <section id="overview" className="relative pt-16 pb-20 px-4 sm:px-6 max-w-5xl mx-auto text-center">
        {/* Release Pill Badge */}
        <div data-source-file="fixtures/1-plain-static.tsx" data-source-line="93" data-source-column="9" className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 hover:border-emerald-500/40 transition mb-6 cursor-pointer backdrop-blur-md shadow-xs">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-medium">Framer Marketplace Award Winner</span>
          <span className="text-slate-400 dark:text-slate-500">·</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">Explore Engine 2.0 →</span>
        </div>

        {/* Primary Headline */}
        <h1
          id="target"
          data-source-file="fixtures/1-plain-static.tsx"
          data-source-line="95"
          className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-950 dark:text-white max-w-4xl mx-auto leading-[1.08] mb-6 text-center"
        >
          Craft digital products at the speed of thought.
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg lg:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10">
          The unified visual studio that connects interface design directly to production React and Tailwind code with zero abstraction.
        </p>

        {/* CTA Button Group */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 mb-12">
          <a
            href="#start"
            data-source-file="fixtures/1-plain-static.tsx"
            data-source-line="123"
            data-source-column="11"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 !text-white dark:!text-slate-950 font-semibold text-sm transition shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            Start Building for Free <ArrowRight size={15} />
          </a>
          <a
            href="#demo"
            className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 !text-white dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border border-slate-900 dark:border-white/10 font-medium text-sm transition backdrop-blur-md cursor-pointer shadow-sm"
          >
            <Play size={14} className="fill-white text-white" />
            <span>Interactive Demo (2 min)</span>
          </a>
        </div>

        {/* Social Proof Avatars */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex -space-x-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 border-2 border-white dark:border-slate-950 flex items-center justify-center text-[10px] text-slate-950 font-bold shadow-xs">
              AK
            </div>
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-400 border-2 border-white dark:border-slate-950 flex items-center justify-center text-[10px] text-white font-bold shadow-xs">
              SR
            </div>
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-rose-500 to-amber-400 border-2 border-white dark:border-slate-950 flex items-center justify-center text-[10px] text-white font-bold shadow-xs">
              EL
            </div>
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 border-2 border-white dark:border-slate-950 flex items-center justify-center text-[10px] text-white font-bold shadow-xs">
              MV
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex text-amber-500 dark:text-amber-400">
              <Star size={13} className="fill-amber-500 dark:fill-amber-400" />
              <Star size={13} className="fill-amber-500 dark:fill-amber-400" />
              <Star size={13} className="fill-amber-500 dark:fill-amber-400" />
              <Star size={13} className="fill-amber-500 dark:fill-amber-400" />
              <Star size={13} className="fill-amber-500 dark:fill-amber-400" />
            </div>
            <span className="font-semibold text-slate-800 dark:text-slate-200">4.9/5</span>
            <span>· Trusted by 45,000+ designers & founders</span>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 3. HERO INTERACTIVE DASHBOARD CANVAS MOCKUP                       */}
        {/* ================================================================= */}
        <div id="showcase" data-source-file="fixtures/1-plain-static.tsx" data-source-line="171" data-source-column="9" className="relative mt-14 mx-auto max-w-5xl rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-slate-900/60 shadow-2xl shadow-slate-300/40 dark:shadow-emerald-950/40 backdrop-blur-2xl p-2 sm:p-3 overflow-hidden text-left transition-colors">
          {/* macOS Titlebar */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-white/[0.02] rounded-t-xl mb-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-black/40 border border-slate-200/80 dark:border-white/5 rounded-md px-3 py-1 text-[11px] font-mono text-slate-600 dark:text-slate-400">
              <Terminal size={11} className="text-emerald-600 dark:text-emerald-400" />
              <span>apex.studio/workspace/hero-banner</span>
            </div>
            <div className="flex items-center gap-2 text-[10.5px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              <span className="hidden sm:inline">AST Synced (120fps)</span>
            </div>
          </div>

          {/* Metric KPI Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                <span>Render Time</span>
                <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-medium">
                  Ultra Fast
                </span>
              </div>
              <div className="text-xl font-bold text-slate-950 dark:text-white font-mono">1.2ms</div>
              <p className="text-[11px] text-slate-500 mt-1">Zero hydration lag</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                <span>Tailwind Drift</span>
                <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-medium">
                  0 Errors
                </span>
              </div>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">0.00%</div>
              <p className="text-[11px] text-slate-500 mt-1">Bidirectional sync lock</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                <span>Team Velocity</span>
                <span className="text-[10px] font-mono text-teal-700 dark:text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded font-medium">
                  +340%
                </span>
              </div>
              <div className="text-xl font-bold text-slate-950 dark:text-white font-mono">4.8×</div>
              <p className="text-[11px] text-slate-500 mt-1">Faster feature shipping</p>
            </div>
          </div>

          {/* Live Canvas Area with Interactive Graph Mockup */}
          <div className="relative rounded-xl bg-slate-50/60 dark:bg-black/40 border border-slate-200/80 dark:border-white/5 p-4 sm:p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Interface Performance Live Graph
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-200/60 dark:bg-white/5 rounded-lg p-1 text-[11px]">
                <button type="button" className="px-2 py-0.5 rounded bg-white dark:bg-white/10 text-slate-900 dark:text-white font-medium shadow-xs">
                  24h
                </button>
                <button type="button" className="px-2 py-0.5 text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white">
                  7d
                </button>
                <button type="button" className="px-2 py-0.5 text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white">
                  30d
                </button>
              </div>
            </div>

            {/* Glowing Bars Chart */}
            <div className="h-32 flex items-end gap-2 sm:gap-4 pt-4 px-2">
              {[25, 42, 38, 65, 50, 78, 60, 92, 70, 85, 96, 100].map((height, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <div
                    style={{ height: `${height}%` }}
                    className={`w-full rounded-t-sm transition-all duration-300 group-hover:brightness-110 ${
                      i >= 8
                        ? 'bg-gradient-to-t from-emerald-600 to-teal-400 shadow-sm shadow-emerald-500/40'
                        : 'bg-slate-300 dark:bg-slate-800 hover:bg-slate-400 dark:hover:bg-slate-700'
                    }`}
                  />
                  <span className="text-[9px] font-mono text-slate-500 dark:text-slate-600">{i + 1}</span>
                </div>
              ))}
            </div>

            {/* Floating Inspector HUD Chip */}
            <div className="mt-4 p-3 rounded-lg bg-white/95 dark:bg-slate-900/90 border border-emerald-500/30 flex items-center justify-between text-xs shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                <span className="font-mono text-emerald-700 dark:text-emerald-300 font-medium">&lt;HeroSection&gt;</span>
                <span className="text-slate-400 dark:text-slate-500">·</span>
                <span className="font-mono text-slate-600 dark:text-slate-400 text-[11px]">p-6 bg-slate-900/60 rounded-2xl</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">AST Verified ✓</span>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 4. LOGO CLOUD / SOCIAL PROOF MARQUEE                                */}
      {/* =================================================================== */}
      <section className="py-12 border-y border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-6">
            Trusted by product engineers at iconic engineering companies
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 text-slate-500 dark:text-slate-400 font-semibold text-sm tracking-wider opacity-80">
            <span className="hover:text-slate-950 dark:hover:text-white transition">STRIPE</span>
            <span className="hover:text-slate-950 dark:hover:text-white transition">LINEAR</span>
            <span className="hover:text-slate-950 dark:hover:text-white transition">VERCEL</span>
            <span className="hover:text-slate-950 dark:hover:text-white transition">RAYCAST</span>
            <span className="hover:text-slate-950 dark:hover:text-white transition">SUPABASE</span>
            <span className="hover:text-slate-950 dark:hover:text-white transition">GITHUB</span>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 5. BENTO GRID FEATURES SHOWCASE                                     */}
      {/* =================================================================== */}
      <section id="features" className="py-24 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block mb-2">
            Engineering Reimagined
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-950 dark:text-white mb-4">
            Everything you need to craft at lightspeed.
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
            No proprietary JSON formats, no code drift. Every visual interaction writes directly to your React codebase.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Bento Card 1: Large (2 Columns) */}
          <div className="md:col-span-2 p-6 sm:p-8 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200/90 dark:border-white/10 shadow-lg shadow-slate-100/50 dark:shadow-none hover:border-emerald-500/30 transition relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5">
              <Code2 size={20} />
            </div>
            <h3 className="text-xl font-bold text-slate-950 dark:text-white mb-2">Direct Bidirectional AST Engine</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6 max-w-xl">
              Visual adjustments modify your React TypeScript AST in-memory with atomic locks. No synthetic DOM layers, no fragile runtime wrappers.
            </p>
            {/* Code Snippet Box */}
            <div className="p-4 rounded-xl bg-slate-900 dark:bg-black/60 border border-slate-800 dark:border-white/5 font-mono text-xs text-slate-300 overflow-x-auto">
              <div className="text-slate-500">// Real-time AST mutation diff</div>
              <div className="text-emerald-400 mt-1">
                + &lt;button className="bg-emerald-500 hover:bg-emerald-400 rounded-xl shadow-lg"&gt;
              </div>
              <div className="text-slate-400 pl-4">Get Started Free →</div>
              <div className="text-emerald-400">+ &lt;/button&gt;</div>
            </div>
          </div>

          {/* Bento Card 2: Small (1 Column) */}
          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200/90 dark:border-white/10 shadow-lg shadow-slate-100/50 dark:shadow-none hover:border-emerald-500/30 transition relative overflow-hidden group">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-5">
              <Layers size={20} />
            </div>
            <h3 className="text-xl font-bold text-slate-950 dark:text-white mb-2">Liquid Glass UI</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
              Apple iOS 44px optical blur, dual specular bevels, and tactile micro-controls built for pure delight.
            </p>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 backdrop-blur-md text-xs text-slate-600 dark:text-slate-300">
              <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                <span>Blur Radius</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">44px</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="w-3/4 h-full bg-emerald-500 rounded-full" />
              </div>
            </div>
          </div>

          {/* Bento Card 3: Small (1 Column) */}
          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200/90 dark:border-white/10 shadow-lg shadow-slate-100/50 dark:shadow-none hover:border-emerald-500/30 transition relative overflow-hidden group">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-5">
              <Cpu size={20} />
            </div>
            <h3 className="text-xl font-bold text-slate-950 dark:text-white mb-2">Zero-Latency Hot Reload</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
              Sub-16ms WebSocket live patching updates your view without remounting components or losing state.
            </p>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">
              <Activity size={14} />
              <span>120 FPS Visual Feedback</span>
            </div>
          </div>

          {/* Bento Card 4: Large (2 Columns) */}
          <div className="md:col-span-2 p-6 sm:p-8 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200/90 dark:border-white/10 shadow-lg shadow-slate-100/50 dark:shadow-none hover:border-emerald-500/30 transition relative overflow-hidden group">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-5">
              <ShieldCheck size={20} />
            </div>
            <h3 className="text-xl font-bold text-slate-950 dark:text-white mb-2">Enterprise Git Safety Locks</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4 max-w-xl">
              Automatic lock arbitration prevents conflicting edits across tabs and teammates, backed by persistent transactional rollback records.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700 dark:text-slate-300">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-medium">
                <CheckCircle2 size={13} />
                <span>Zero Merge Collisions</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                <span>Multi-file atomic transactions</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 6. KEY STATS & NUMBERS ROW                                          */}
      {/* =================================================================== */}
      <section id="metrics" className="py-16 border-t border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold text-slate-950 dark:text-white font-mono mb-1">10M+</div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Edits compiled directly</p>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mb-1">99.99%</div>
              <p className="text-xs text-slate-500 dark:text-slate-400">AST parsing accuracy</p>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold text-slate-950 dark:text-white font-mono mb-1">0ms</div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Production runtime penalty</p>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold text-teal-600 dark:text-teal-400 font-mono mb-1">4.9/5</div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Developer satisfaction</p>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 7. DESIGNER TESTIMONIAL QUOTE CARD                                  */}
      {/* =================================================================== */}
      <section className="py-20 px-4 sm:px-6 max-w-4xl mx-auto text-center">
        <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-gradient-to-b dark:from-white/[0.04] dark:to-transparent border border-slate-200/80 dark:border-white/10 backdrop-blur-xl relative shadow-xl shadow-slate-900/5 dark:shadow-2xl">
          <div className="flex justify-center text-amber-500 dark:text-amber-400 mb-6">
            <Star size={16} className="fill-amber-500 dark:fill-amber-400" />
            <Star size={16} className="fill-amber-500 dark:fill-amber-400" />
            <Star size={16} className="fill-amber-500 dark:fill-amber-400" />
            <Star size={16} className="fill-amber-500 dark:fill-amber-400" />
            <Star size={16} className="fill-amber-500 dark:fill-amber-400" />
          </div>
          <blockquote className="text-lg sm:text-2xl text-slate-800 dark:text-slate-200 font-medium leading-relaxed mb-8">
            &ldquo;Apex Studio bridged the gap between Figma and production React so cleanly that our entire frontend engineering team adopted it in their first sprint. It feels like pure superpower.&rdquo;
          </blockquote>
          <div>
            <div className="font-semibold text-slate-950 dark:text-white text-sm">Elena Rostova</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Design Systems Lead at Synthetix · Former Apple UI Architect</div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 8. BOTTOM HIGH-CONVERTING CTA BANNER                                */}
      {/* =================================================================== */}
      <section id="start" className="py-20 px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="relative rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-10 sm:p-16 text-center overflow-hidden shadow-2xl border border-slate-800">
          <div className="absolute inset-0 bg-radial-gradient from-emerald-500/15 to-transparent pointer-events-none" />
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Ready to build at the speed of thought?
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto leading-relaxed mb-8">
            Join over 45,000 product engineers, founders, and designers shipping award-winning software.
          </p>
          <a
            href="#overview"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition shadow-xl cursor-pointer"
          >
            <span>Get Started Free Today</span>
            <ArrowRight size={16} />
          </a>
          <p className="text-xs text-slate-400 mt-4">No credit card required · Free 14-day trial · Instant setup</p>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 9. SAAS FOOTER                                                      */}
      {/* =================================================================== */}
      <footer className="border-t border-slate-200/80 dark:border-white/10 py-12 px-4 sm:px-6 max-w-6xl mx-auto text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center text-white font-bold text-[10px]">
            ⚡
          </div>
          <span className="text-slate-600 dark:text-slate-400">Apex Studio © 2026. Powered by SlightNudge Visual Studio.</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#features" className="hover:text-slate-950 dark:hover:text-slate-300 transition cursor-pointer">
            Features
          </a>
          <a href="#privacy" className="hover:text-slate-950 dark:hover:text-slate-300 transition cursor-pointer">
            Privacy
          </a>
          <a href="#terms" className="hover:text-slate-950 dark:hover:text-slate-300 transition cursor-pointer">
            Terms
          </a>
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
            <span>Systems Normal</span>
          </span>
        </div>
      </footer>
    </main>
  );
}
