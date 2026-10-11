'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Anchor, Menu, X } from 'lucide-react';

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
    <div className="nav-inner">
      <Link href="/" className="brand" aria-label="ShipCheck home"><span className="brand-mark"><Anchor size={16}/></span>ShipCheck</Link>
      <button className="mobile-toggle" type="button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={19}/> : <Menu size={19}/>}</button>
      <nav className={`nav-links ${menuOpen ? 'menu-open' : ''}`} aria-label="Main navigation">
        <Link href="/#sample-report" onClick={() => setMenuOpen(false)}>How it works</Link>
        <Link href="/pricing" onClick={() => setMenuOpen(false)}>Pricing</Link>
        <Link href="/dashboard" onClick={() => setMenuOpen(false)}>My scans</Link>
        <Link className="nav-cta" href="/new" onClick={() => setMenuOpen(false)}>Run a scan <span aria-hidden="true">↗</span></Link>
      </nav>
    </div>
  </header>;
}
