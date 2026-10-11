'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, ChevronRight, FolderGit2, GitBranch, LoaderCircle, Plus, Sparkles, X } from 'lucide-react';

interface Repository {
  id: string;
  name: string;
  owner: string;
  url: string;
  defaultBranch: string;
  importedAt: string;
}

export default function WorkspaceHome() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/slightnudge/repositories');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load repositories.');
      setRepositories(data.repositories || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load repositories.');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const openImport = () => setDialogOpen(true);
    window.addEventListener('slightnudge:open-import', openImport);
    return () => window.removeEventListener('slightnudge:open-import', openImport);
  }, [refresh]);

  async function importRepository(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/slightnudge/repositories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: repoUrl }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Repository import failed.');
      setRepositories((current) => current.some((item) => item.id === data.repository.id)
        ? current
        : [data.repository, ...current]);
      setRepoUrl('');
      setDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Repository import failed.');
    } finally {
      setLoading(false);
    }
  }

  return <div className="sn-workspace">
    <main className="sn-home-main">
      <div className="sn-home-heading">
        <div><p className="sn-eyebrow">YOUR WORKSPACE</p><h1>Make the small changes<br className="sn-desktop-break"/> feel small.</h1><p className="sn-home-lede">Open a project, pick a page, and make the visual change directly. Your source stays in your repository.</p></div>
        <button className="sn-button sn-button-primary" type="button" onClick={() => { setError(''); setDialogOpen(true); }}><Plus size={17}/> Add from GitHub</button>
      </div>

      <section className="sn-project-section" aria-labelledby="projects-heading">
        <div className="sn-section-title"><div><h2 id="projects-heading">Projects</h2><p>Your local demo and imported repositories.</p></div><span className="sn-project-count">{repositories.length + 1} {repositories.length === 0 ? 'workspace' : 'workspaces'}</span></div>

        <Link className="sn-demo-project" href="/studio" aria-label="Open the SlightNudge demo editor">
          <div className="sn-demo-top"><span className="sn-project-icon"><Sparkles size={18}/></span><span className="sn-demo-tag"><span/> READY TO EDIT</span></div>
          <div className="sn-demo-copy"><span className="sn-project-type">STARTER PROJECT</span><h3>SlightNudge Playground</h3><p>A small SaaS page built for trying visual edits. No repository setup needed.</p></div>
          <div className="sn-demo-bottom"><span><FolderGit2 size={15}/> Local example <span className="sn-separator">·</span> 5 test pages</span><span className="sn-open-link">Open editor <ArrowUpRight size={16}/></span></div>
        </Link>

        {repositories.length > 0 && <div className="sn-repo-list">{repositories.map((repo) => <article className="sn-repo-card" key={repo.id}>
          <span className="sn-repo-icon"><GitBranch size={18}/></span><div className="sn-repo-details"><h3>{repo.owner}<span>/</span>{repo.name}</h3><p>Imported from GitHub · Source files cloned locally</p><span className="sn-branch"><GitBranch size={13}/>{repo.defaultBranch}</span></div><div className="sn-repo-state"><span className="sn-state-dot"/>Imported</div><Link href={`/studio/${encodeURIComponent(repo.id)}`} className="sn-icon-link" aria-label={`Open ${repo.name}`}><ChevronRight size={19}/></Link>
        </article>)}</div>}

        {loaded && repositories.length === 0 && <div className="sn-empty-repos"><div className="sn-empty-mark"><FolderGit2 size={18}/></div><div><strong>Your repositories will show up here</strong><p>Import a public GitHub repository to add it to this workspace.</p></div><button type="button" className="sn-button sn-button-secondary" onClick={() => setDialogOpen(true)}>Add repository <Plus size={15}/></button></div>}
      </section>

      <section className="sn-how-section"><div className="sn-how-heading"><p className="sn-eyebrow">A CLEAR PLACE TO START</p><h2>From repository<br/>to refinement.</h2></div><div className="sn-steps"><article><span>01</span><div><h3>Bring in a project</h3><p>Start with the example, or clone a public GitHub repository into this workspace.</p></div></article><article><span>02</span><div><h3>Choose a page</h3><p>Open the canvas and select a visible element to inspect its source and styles.</p></div></article><article><span>03</span><div><h3>Make a visual change</h3><p>Adjust spacing in the playground; edits are written back to its source file.</p></div></article></div></section>
    </main>

    {dialogOpen && <div className="sn-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !loading) setDialogOpen(false); }}>
      <section className="sn-dialog" role="dialog" aria-modal="true" aria-labelledby="import-title">
        <div className="sn-dialog-head"><span className="sn-dialog-icon"><GitBranch size={19}/></span><button type="button" className="sn-icon-link" aria-label="Close dialog" onClick={() => !loading && setDialogOpen(false)}><X size={18}/></button></div>
        <p className="sn-eyebrow">REPOSITORY IMPORT</p><h2 id="import-title">Add a project from GitHub</h2><p className="sn-dialog-lede">SlightNudge will clone the repository into this local workspace. Nothing is pushed back to GitHub.</p>
        <form onSubmit={importRepository} className="sn-import-form"><label htmlFor="github-repo-url">Repository URL</label><div className="sn-url-field"><GitBranch size={16}/><input id="github-repo-url" type="url" required autoFocus placeholder="https://github.com/owner/repository" value={repoUrl} onChange={(event) => setRepoUrl(event.target.value)}/></div>{error && <p role="alert" className="sn-form-error">{error}</p>}<p className="sn-form-hint">Public GitHub repositories are supported. Private repository authorization isn’t connected yet.</p><button className="sn-button sn-button-primary sn-import-submit" disabled={loading || !repoUrl.trim()} type="submit">{loading ? <><LoaderCircle className="sn-spinner" size={16}/> Cloning repository…</> : <>Clone repository <ArrowUpRight size={16}/></>}</button></form>
        <div className="sn-dialog-foot"><Check size={14}/> Imported files stay on this machine.</div>
      </section>
    </div>}
  </div>;
}


