'use client';
import { readApiJson } from '@/lib/slightnudge/api-response';


import { useEffect, useRef, useState } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { getClientSessionToken } from '@/lib/slightnudge/client';
import type { HistoryEntry } from '@/lib/slightnudge/history-summary';
import styles from './change-history.module.css';

export function ChangeHistory({ repositoryId, draft, recovery, onClose }: { repositoryId?: string; draft: { summary: string; state: 'draft' | 'redo' }[]; recovery: boolean; onClose(): void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [revision, setRevision] = useState(0);
  useEffect(() => { const node = dialog.current; if (node && !node.open) node.showModal(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    const load = async () => {
      let token = await getClientSessionToken();
      const request = () => fetch('/api/slightnudge/history', { method: 'POST', signal: controller.signal, headers: { 'content-type': 'application/json', 'x-slightnudge-token': token }, body: JSON.stringify({ repositoryId }) });
      let response = await request();
      if (response.status === 403) { token = await getClientSessionToken(true); response = await request(); }
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error || 'History is unavailable.');
      if (!controller.signal.aborted) setEntries(data.entries);
    };
    void load().catch(cause => { if (!controller.signal.aborted) setError(cause.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [repositoryId, revision]);
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="change-history-title" onClose={onClose} onKeyDown={event => event.stopPropagation()}>
    <header><div><h2 id="change-history-title">Change history</h2><p>Drafts stay local until you save.</p></div><button type="button" aria-label="Close change history" autoFocus onClick={() => dialog.current?.close()}><X size={17}/></button></header>
    <div className={styles.content}>
      {recovery && <p className={styles.attention} role="status">A source operation needs confirmation. Use the recovery controls before editing again.</p>}
      <section aria-label="Unsaved changes"><h3>Current draft <span>{draft.filter(entry => entry.state === 'draft').length}</span></h3>
        {!draft.length ? <p className={styles.empty}>No unsaved changes.</p> : <ol>{draft.map((entry, index) => <li key={index} data-state={entry.state}><span className={styles.marker}/><div><strong>{entry.summary}</strong><small>{entry.state === 'draft' ? 'Unsaved' : 'Undone · available with Redo'}</small></div></li>)}</ol>}
      </section>
      <section aria-label="Saved changes"><div className={styles.heading}><h3>Recent saves</h3><button type="button" disabled={loading} aria-label="Refresh saved history" onClick={() => setRevision(value => value + 1)}><RotateCcw size={13}/> Refresh</button></div>
        {loading ? <p role="status" className={styles.empty}>Loading saved history…</p> : error ? <p role="alert" className={styles.attention}>{error}</p> : !entries.length ? <p className={styles.empty}>Your saves will appear here.</p> : <ol>{entries.map(entry => <li key={entry.id} data-state={entry.state}><span className={styles.marker}/><div><strong>{entry.summary}</strong><small>{entry.state === 'saved' ? 'Saved to source' : entry.state === 'undone' ? 'Save undone' : 'Needs attention'}{entry.createdAt && <> · <time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString()}</time></>}</small><ul>{entry.files.map(file => <li key={file}>{file}</li>)}</ul></div></li>)}</ol>}
      </section>
    </div>
    <footer>Recent saves are a record of your edits. Undo is available in the editor.</footer>
  </dialog>;
}
