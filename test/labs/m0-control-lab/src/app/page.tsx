import { FAQ } from '@/components/sections/FAQ';
import { Features } from '@/components/sections/Features';
import { Footer } from '@/components/sections/Footer';
import { Hero } from '@/components/sections/Hero';
import { Pricing } from '@/components/sections/Pricing';
import { Testimonials } from '@/components/sections/Testimonials';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f8f6] text-slate-950">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
        <a href="#top" className="flex items-center gap-3 font-semibold tracking-tight" aria-label="Northstar home">
          <span className="grid size-9 place-items-center rounded-xl bg-emerald-700 text-sm font-bold text-white">N</span>
          Northstar
        </a>
        <nav className="hidden items-center gap-8 text-sm text-slate-600 md:flex" aria-label="Main navigation">
          <a href="#features" className="transition-colors hover:text-slate-950">Features</a>
          <a href="#pricing" className="transition-colors hover:text-slate-950">Pricing</a>
          <a href="#faq" className="transition-colors hover:text-slate-950">FAQ</a>
        </nav>
        <a href="#pricing" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-800 active:scale-[0.98]">Start free</a>
      </header>
      <Hero
        eyebrow="A calmer way to run your business"
        title="Make room for your best work."
        description="One thoughtful workspace for the people, projects, and plans that move your business forward."
        primaryAction="Explore the workspace"
      />
      <Features />
      <Pricing />
      <Testimonials />
      <FAQ />
      <Footer />
    </main>
  );
}
