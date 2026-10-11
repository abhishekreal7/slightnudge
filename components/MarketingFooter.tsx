import Link from 'next/link';
import Image from 'next/image';

export function MarketingFooter() {
  return <footer className="sn-marketing-footer"><div className="sn-marketing-footer-inner"><Link href="/" className="sn-brand"><span className="sn-brand-icon"><Image src="/icon.svg" alt="" width={26} height={26} className="sn-brand-favicon" unoptimized/></span><span>SlightNudge</span></Link><p>A more direct way to refine the interface you already have.</p><nav aria-label="Footer"><Link href="/how-it-works">How it works</Link><Link href="/pricing">Pricing</Link><Link href="/workspace">Open workspace</Link><Link href="/privacy">Privacy</Link></nav><small>© {new Date().getFullYear()} SlightNudge</small></div></footer>;
}
