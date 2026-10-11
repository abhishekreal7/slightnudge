import Link from 'next/link';
import { ArrowUpRight, Compass } from 'lucide-react';

export default function NotFound() {
  return <main className="content-page not-found"><p className="eyebrow"><Compass size={13}/> LOST ROUTE</p><h1>This page<br/>is off course.</h1><p>That address doesn’t point to a ShipCheck page. Head back to your scans or start a fresh browser run.</p><div className="design-row"><Link href="/" className="button button-primary">Back to ShipCheck <ArrowUpRight size={16}/></Link><Link href="/dashboard" className="text-link">View my scans</Link></div></main>;
}
