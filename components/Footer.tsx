import Link from 'next/link';

export function Footer() {
  return <footer className="site-footer"><div className="footer-inner"><div><Link href="/" className="footer-brand">ShipCheck</Link><p>Evidence-backed browser testing for web apps. Test with an isolated Chromium browser and see what breaks before you ship.</p></div><nav className="footer-links" aria-label="Footer navigation"><Link href="/pricing">Pricing</Link><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/refunds">Refunds</Link></nav></div><div className="footer-bottom">One-time scan payments · Processed securely by Dodo Payments</div></footer>;
}
