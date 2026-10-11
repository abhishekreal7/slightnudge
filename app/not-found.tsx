import Link from 'next/link';
import { ArrowUpRight, Compass } from 'lucide-react';

export default function NotFound() {
  return <main className="content-page not-found"><p className="eyebrow"><Compass size={13}/> PAGE NOT FOUND</p><h1>This page<br/>is out of frame.</h1><p>That address doesn’t point to a SlightNudge page. Head back to the workspace or try the playground.</p><div className="design-row"><Link href="/workspace" className="button button-primary">Back to workspace <ArrowUpRight size={16}/></Link><Link href="/studio" className="text-link">Open the playground</Link></div></main>;
}
