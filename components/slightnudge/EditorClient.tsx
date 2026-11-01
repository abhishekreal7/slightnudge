'use client';

import { useEffect, useState, type ComponentProps } from 'react';
import { EditorWorkspace } from './EditorWorkspace';

/** Browser-local recovery and a recompiling editor must start from one client
 * revision, rather than hydrate workspace DOM streamed from an older build. */
export function EditorClient(props: ComponentProps<typeof EditorWorkspace>) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return <div role="status" aria-label="Loading editor" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#f8f9fa', color: '#637269', fontSize: 13 }}>Opening editor…</div>;
  return <EditorWorkspace {...props} />;
}
