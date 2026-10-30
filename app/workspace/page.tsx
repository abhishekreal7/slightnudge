'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowUpRight, BookOpen, Check, ChevronRight, Code2, FileCode2, Folder, FolderGit2, GitBranch, LayoutTemplate, LoaderCircle, MousePointer2, PanelLeftClose, Plus, Search, ShieldCheck, Undo2, X } from 'lucide-react';
import { getClientSessionToken } from '@/lib/slightnudge/client';
import styles from './workspace.module.css';

interface Repository { id: string; name: string; owner: string; url: string; defaultBranch: string; importedAt: string }
type Filter = 'all' | 'imported' | 'playground';

export default function WorkspaceHome() {
  const router = useRouter();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const search = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const refresh = useCallback(async () => {
    setLoadError(''); setLoaded(false);
    try {
      const response = await fetch('/api/slightnudge/repositories');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Projects could not be loaded.');
      setRepositories(data.repositories || []);
    } catch (cause) { setLoadError(cause instanceof Error ? cause.message : 'Projects could not be loaded.'); }
    finally { setLoaded(true); }
  }, []);
  const openImport = useCallback(() => { setImportError(''); dialog.current?.showModal(); }, []);
  useEffect(() => {
    void refresh();
    const keyboard = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !dialog.current?.open) { event.preventDefault(); search.current?.focus(); }
    };
    window.addEventListener('keydown', keyboard); window.addEventListener('slightnudge:open-import', openImport);
    return () => { window.removeEventListener('keydown', keyboard); window.removeEventListener('slightnudge:open-import', openImport); };
  }, [refresh, openImport]);

  async function importRepository(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (importing) return;
    setImporting(true); setImportError('');
    try {
      const token = await getClientSessionToken();
      const response = await fetch('/api/slightnudge/repositories', { method: 'POST', headers: { 'content-type': 'application/json', 'x-slightnudge-token': token }, body: JSON.stringify({ url: repoUrl }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'This project could not be imported.');
      setRepositories(current => current.some(item => item.id === data.repository.id) ? current : [data.repository, ...current]);
      dialog.current?.close(); setRepoUrl(''); router.push(`/studio/${encodeURIComponent(data.repository.id)}`);
    } catch (cause) { setImportError(cause instanceof Error ? cause.message : 'This project could not be imported.'); }
    finally { setImporting(false); }
  }
  const projects = useMemo(() => repositories.filter(repo => repo.owner !== 'local'), [repositories]);
  const matching = projects.filter(repo => `${repo.name} ${repo.owner} ${repo.defaultBranch}`.toLowerCase().includes(query.trim().toLowerCase()));
  const showPlayground = filter !== 'imported' && 'slightnudge playground sample page'.includes(query.trim().toLowerCase());
  const visibleProjects = filter === 'playground' ? [] : matching;
  const total = projects.length + 1;

  return <div className={`${styles.workspace} ${collapsed ? styles.collapsed : ''}`}>
    <aside className={styles.sidebar} aria-label="Workspace navigation">
      <div className={styles.brandRow}><Link href="/" className={styles.brand} aria-label="SlightNudge home"><Image src="/icon.svg" width={27} height={27} alt="" unoptimized/><span>SlightNudge</span></Link><button className={styles.iconButton} onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}><PanelLeftClose size={15}/></button></div>
      <div className={styles.workspaceName}><span className={styles.localDot}/><span>Local workspace</span></div>
      <nav className={styles.navigation}><button className={styles.selectedNav} onClick={() => { setFilter('all'); setQuery(''); }} title="Projects"><Folder size={16}/><span>Projects</span><small>{loaded ? total : '—'}</small></button><Link href="/studio" title="Playground"><LayoutTemplate size={16}/><span>Playground</span><ArrowUpRight size={12}/></Link></nav>
      <div className={styles.recent}><p>Imported projects</p>{projects.slice(0, 5).map(repo => <Link key={repo.id} href={`/studio/${encodeURIComponent(repo.id)}`} title={`${repo.owner}/${repo.name}`}><FolderGit2 size={14}/><span>{repo.name}</span></Link>)}{loaded && !projects.length && <span className={styles.sidebarHint}>Your projects will appear here.</span>}</div>
      <div className={styles.sidebarBottom}><div className={styles.localNote}><ShieldCheck size={16}/><span>Your files. Your decision.<small>Review before you apply.</small></span></div><Link href="/how-it-works" title="How SlightNudge works"><BookOpen size={15}/><span>How it works</span><ArrowUpRight size={12}/></Link></div>
    </aside>

    <main className={styles.main}>
      <header className={styles.topbar}>
        <nav aria-label="Breadcrumb"><Folder size={15}/><span>Workspace</span><ChevronRight size={12}/><strong>Projects</strong></nav>
        <div className={styles.topbarActions}><span className={styles.topbarNote}><span className={styles.localDot}/>Local-first</span><button className={styles.primaryButton} onClick={openImport}><Plus size={15}/>Import project</button></div>
      </header>
      <div className={styles.content}>
        <div className={styles.canvasHeading}><div><h1>Your projects</h1><p>A small change starts with the right project.</p></div><span className={styles.canvasHint}><ShieldCheck size={14}/>Your source stays yours.</span></div>
        <div className={styles.canvasLayout}>
          <div className={styles.projectColumn}>
        <section className={styles.projectsSection} aria-label="Projects">
          <div className={styles.sectionHeading}><h2>Projects <span>{loaded ? total : '—'}</span></h2><span className={styles.panelMeta}>Local workspace</span></div>
          <div className={styles.listToolbar}><div className={styles.tabs} role="group" aria-label="Project filter">{([{ id: 'all', label: 'All projects' }, { id: 'imported', label: 'Imported' }, { id: 'playground', label: 'Playground' }] as const).map(tab => <button key={tab.id} aria-pressed={filter === tab.id} onClick={() => setFilter(tab.id)}>{tab.label}</button>)}</div><div className={styles.search}><Search size={14}/><input ref={search} type="search" aria-label="Search projects" placeholder="Find a project…" value={query} onChange={event => setQuery(event.target.value)}/>{query ? <button aria-label="Clear search" onClick={() => setQuery('')}><X size={12}/></button> : <kbd>Ctrl K</kbd>}</div></div>
          <div className={styles.projectList}>
            <div className={styles.tableHead}><span>Project</span><span>Source</span><span>Branch</span><span/></div>
            {!loaded && <div className={styles.loading} role="status"><LoaderCircle size={16} className={styles.spinner}/>Loading projects…</div>}
            {loadError && <div className={styles.empty}><p role="alert">{loadError}</p><button onClick={() => void refresh()} className={styles.secondaryButton}>Try again</button></div>}
            {loaded && !loadError && <>
              {showPlayground && <Link href="/studio" className={styles.projectRow} aria-label="Open playground sample page"><div className={styles.projectIdentity}><span className={`${styles.projectIcon} ${styles.sampleIcon}`}><LayoutTemplate size={19}/></span><div><strong>SlightNudge Playground</strong><small>A sample page to explore the editor</small></div></div><span className={styles.sourceType}>Sample page</span><span className={styles.branch}>—</span><ArrowUpRight size={15}/></Link>}
              {visibleProjects.map(repo => <Link key={repo.id} href={`/studio/${encodeURIComponent(repo.id)}`} className={styles.projectRow} aria-label={`${repo.name} ${repo.owner} Open project`}><div className={styles.projectIdentity}><span className={styles.projectIcon}><FolderGit2 size={19}/></span><div><strong>{repo.name}</strong><small>{repo.owner}/{repo.name}</small></div></div><span className={styles.sourceType}><span className={styles.repoDot}/>GitHub</span><span className={styles.branch}><GitBranch size={12}/>{repo.defaultBranch || '—'}</span><ArrowUpRight size={15}/></Link>)}
              {!showPlayground && !visibleProjects.length && <div className={styles.empty}><Search size={20}/><h3>{query ? 'No projects found' : 'A place for your next project.'}</h3><p>{query ? 'Try another name, owner or branch.' : 'Import a public GitHub repository to check its compatibility and connect a local preview.'}</p><button className={styles.secondaryButton} onClick={query ? () => setQuery('') : openImport}>{query ? 'Clear search' : 'Import from GitHub'}<ArrowRight size={13}/></button></div>}
            </>}
          </div>
          <div className={styles.listFootnote}><ShieldCheck size={13}/><span>Projects open in setup first, so you can check compatibility before editing.</span></div>
        </section>
            <div className={styles.projectCaption}><FileCode2 size={14}/><span>Next.js + Tailwind source mapping.<br/><small>Unsupported edits are refused, never guessed.</small></span></div>
          </div>
          <section className={styles.flowExample} aria-label="The editing workflow">
            <div className={styles.flowHeading}><span className={styles.smallLabel}>From preview to source</span><span>Example edit</span></div>
            <div className={styles.flowStart}><span className={styles.flowBadge}><MousePointer2 size={14}/></span><span>Select an element</span></div>
            <div className={styles.flowConnector}/>
            <div className={styles.flowNode}>
              <div className={styles.flowNodeTitle}><span className={`${styles.flowBadge} ${styles.blueBadge}`}><Code2 size={14}/></span><strong>Find its source</strong><small>01</small></div>
              <div className={styles.flowInset}><FileCode2 size={13}/><code>app/page.tsx</code><span className={styles.flowSourceTag}>h1</span></div>
            </div>
            <div className={styles.flowConnector}/>
            <div className={styles.flowNode}>
              <div className={styles.flowNodeTitle}><span className={`${styles.flowBadge} ${styles.purpleBadge}`}><LayoutTemplate size={14}/></span><strong>Refine it visually</strong><small>02</small></div>
              <div className={styles.flowInset}><span>Text size</span><div className={styles.flowSize}><span>lg</span><ArrowRight size={12}/><strong>xl</strong></div></div>
            </div>
            <div className={styles.flowConnector}/>
            <div className={styles.flowNode}>
              <div className={styles.flowNodeTitle}><span className={`${styles.flowBadge} ${styles.amberBadge}`}><FileCode2 size={14}/></span><strong>Review the exact change</strong><small>03</small></div>
              <div className={styles.diff} aria-label="Example source change"><div><span>−</span><code>text-lg</code><small>Before</small></div><div><span>+</span><code>text-xl</code><small>After</small></div></div>
            </div>
            <div className={styles.flowFork}><span/><span/></div>
            <div className={styles.flowBranches}><div className={styles.flowOutcome}><X size={13}/><span>Discard</span></div><div className={`${styles.flowOutcome} ${styles.applyOutcome}`}><Check size={13}/><span>Apply to source</span></div></div>
            <p className={styles.undoNote}><Undo2 size={12}/>Undo an accepted edit when you need to.</p>
            <Link href="/how-it-works" className={styles.flowGuide}>Explore the editing workflow<ArrowUpRight size={12}/></Link>
          </section>
        </div>
        <footer className={styles.footer}><span><ShieldCheck size={12}/>Review before applying.</span><span>No automatic commits, pushes or deployments.</span></footer>
      </div>
    </main>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="import-project-title" onCancel={event => { if (importing) event.preventDefault(); }}><form onSubmit={importRepository}>
      <div className={styles.dialogTop}><span className={styles.cardIcon}><FolderGit2 size={21}/></span><button type="button" className={styles.iconButton} aria-label="Close import" disabled={importing} onClick={() => dialog.current?.close()}><X size={17}/></button></div>
      <p className={styles.smallLabel}>Bring your project</p><h2 id="import-project-title">Import a project</h2><p>Start with a public GitHub repository. We’ll clone it locally, then you can check compatibility and connect its preview.</p>
      <label htmlFor="public-repository">Public GitHub repository</label><input id="public-repository" autoFocus required type="url" placeholder="https://github.com/you/your-project" value={repoUrl} onChange={event => setRepoUrl(event.target.value)} disabled={importing}/>
      <div className={styles.compatibility}><FileCode2 size={14}/><span>Visual source mapping currently supports Next.js. Vite is not yet supported.</span></div>{importError && <p className={styles.importError} role="alert">{importError}</p>}
      <div className={styles.dialogActions}><button type="button" className={styles.secondaryButton} disabled={importing} onClick={() => dialog.current?.close()}>Cancel</button><button type="submit" className={styles.primaryButton} disabled={importing}>{importing ? <><LoaderCircle size={14} className={styles.spinner}/>Importing…</> : <>Import repository<ArrowRight size={14}/></>}</button></div>
    </form></dialog>
  </div>;
}
