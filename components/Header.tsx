'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight, Menu, Plus, X } from 'lucide-react';

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const marketing = pathname === '/' || pathname.startsWith('/how-it-works') || pathname === '/pricing';
  const workspace = pathname === '/workspace';
  useEffect(() => {
    if (!marketing) return;
    const updateScrollState = () => setScrolled(window.scrollY > 8);
    updateScrollState();
    window.addEventListener('scroll', updateScrollState, { passive: true });
    return () => window.removeEventListener('scroll', updateScrollState);
  }, [marketing]);
  if (pathname === '/studio' || pathname.startsWith('/studio/') || pathname.startsWith('/fixtures') || pathname === '/workspace' || pathname.startsWith('/workspace/')) return null;

  return <header className={`sn-app-header ${marketing ? `sn-marketing-header${scrolled ? ' is-scrolled' : ''}` : ''}`}>
    <div className="sn-header-inner">
      <Link href="/" className="sn-brand" aria-label="SlightNudge home"><span className="sn-brand-icon"><Image src="/icon.svg" alt="" width={30} height={30} className="sn-brand-favicon" unoptimized/></span><span>SlightNudge</span></Link>
      <button className="sn-mobile-menu-button" type="button" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={19}/> : <Menu size={19}/>}</button>
      <nav className={`sn-header-nav ${open ? 'is-open' : ''}`} aria-label="Main navigation">
        {marketing ? <>
          <Link href="/how-it-works" aria-current={pathname.startsWith('/how-it-works') ? 'page' : undefined} onClick={() => setOpen(false)}>How it works</Link>
          <Link href="/pricing" aria-current={pathname === '/pricing' ? 'page' : undefined} onClick={() => setOpen(false)}>Pricing</Link>
          <Link className="sn-marketing-cta" href="/workspace" onClick={() => setOpen(false)}>Open workspace <ArrowRight size={15}/></Link>
        </> : workspace ? <>
          <Link href="/" onClick={() => setOpen(false)}>Home</Link>
          <Link href="/workspace" aria-current="page" onClick={() => setOpen(false)}>Projects</Link>
          <button className="sn-header-add" type="button" onClick={() => { setOpen(false); window.dispatchEvent(new Event('slightnudge:open-import')); }}><Plus size={15}/> Add repository</button>
        </> : <>
          <Link href="/" onClick={() => setOpen(false)}>About SlightNudge</Link>
          <Link className="sn-marketing-cta" href="/workspace" onClick={() => setOpen(false)}>Projects <ArrowRight size={15}/></Link>
        </>}
      </nav>
    </div>
  </header>;
}
