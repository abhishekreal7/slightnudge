import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, FileText, ShieldCheck } from 'lucide-react';

export function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="sn-marketing-footer">
      <div className="sn-marketing-footer-inner">
        <div className="sn-footer-identity">
          <Link href="/" className="sn-brand" aria-label="SlightNudge home">
            <span className="sn-brand-icon"><Image src="/icon.svg" alt="" width={26} height={26} className="sn-brand-favicon" unoptimized /></span>
            <span>SlightNudge</span>
          </Link>
          <small>{year} © SlightNudge. All rights reserved.</small>
        </div>

        <nav aria-label="Footer navigation">
          <Link href="/">Home</Link>
          <Link href="/#workflow">Workflow</Link>
          <Link href="/#source">Source</Link>
          <Link href="/#principles">Product</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/how-it-works">Guide</Link>
        </nav>

        <div className="sn-footer-utilities" aria-label="More links">
          <Link href="/studio" aria-label="Open playground" title="Open playground"><ArrowUpRight size={17} /></Link>
          <Link href="/privacy" aria-label="Privacy policy" title="Privacy"><ShieldCheck size={17} /></Link>
          <Link href="/terms" aria-label="Terms of service" title="Terms"><FileText size={17} /></Link>
        </div>
      </div>
    </footer>
  );
}
