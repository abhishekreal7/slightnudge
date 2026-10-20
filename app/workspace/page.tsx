'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getClientSessionToken } from '@/lib/slightnudge/client';
import {
  ArrowUpDown,
  ArrowUpRight,
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  FileCode2,
  FileText,
  Filter,
  FolderGit2,
  GitBranch,
  Globe,
  Home,
  Kanban,
  Layers,
  LayoutGrid,
  LoaderCircle,
  MoreHorizontal,
  PanelLeft,
  PanelLeftClose,
  Plus,
  Search,
  Settings,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Star,
  Table,
  Terminal,
  X,
} from 'lucide-react';

interface Repository {
  id: string;
  name: string;
  owner: string;
  url: string;
  defaultBranch: string;
  importedAt: string;
}

interface WorkspaceItem {
  id: string;
  name: string;
  owner: string;
  type: 'starter' | 'github' | 'local';
  icon: string;
  branch: string;
  routesCount: number;
  status: 'ready' | 'cloned' | 'fixture';
  statusText: string;
  description: string;
  href: string;
  updatedText: string;
}

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #e4ebf5 0%, #faedf0 35%, #edf3eb 70%, #f7f3e8 100%)',
  'linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 50%, #bcccdc 100%)',
  'linear-gradient(135deg, #fdfbf7 0%, #f3ece0 50%, #e8dfcf 100%)',
  'linear-gradient(135deg, #f3e8ee 0%, #e7d8e2 50%, #d8c2d2 100%)',
  'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 50%, #a5d6a7 100%)',
];

export default function WorkspaceHome() {
  const router = useRouter();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'starters' | 'github' | 'local'>('all');
  const [viewMode, setViewMode] = useState<'gallery' | 'table' | 'board'>('gallery');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'ready' | 'cloned'>('all');
  const [isStarred, setIsStarred] = useState(false);
  const [coverIndex, setCoverIndex] = useState(0);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [quickFindOpen, setQuickFindOpen] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

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
    const openImport = () => setImportDialogOpen(true);
    window.addEventListener('slightnudge:open-import', openImport);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setQuickFindOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setImportDialogOpen(false);
        setShareDialogOpen(false);
        setQuickFindOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('slightnudge:open-import', openImport);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [refresh]);

  async function importRepository(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const token = await getClientSessionToken();
      const response = await fetch('/api/slightnudge/repositories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-slightnudge-token': token,
        },
        body: JSON.stringify({ url: repoUrl }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Repository import failed.');
      setRepositories((current) =>
        current.some((item) => item.id === data.repository.id)
          ? current
          : [data.repository, ...current]
      );
      setRepoUrl('');
      setImportDialogOpen(false);
      router.push(`/studio/${encodeURIComponent(data.repository.id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Repository import failed.');
    } finally {
      setLoading(false);
    }
  }

  // Unified items list
  const allItems: WorkspaceItem[] = useMemo(() => {
    const starter: WorkspaceItem = {
      id: 'slightnudge-playground',
      name: 'SlightNudge Playground',
      owner: 'starter',
      type: 'starter',
      icon: '⚡',
      branch: 'main',
      routesCount: 5,
      status: 'ready',
      statusText: 'Ready to edit',
      description: 'Zero-configuration SaaS sandbox with 5 test pages',
      href: '/studio',
      updatedText: 'Updated today',
    };

    const repoItems: WorkspaceItem[] = repositories.map((repo) => {
      const isLocal = repo.owner === 'local';
      return {
        id: repo.id,
        name: repo.name,
        owner: repo.owner,
        type: isLocal ? 'local' : 'github',
        icon: isLocal ? '🧪' : '🐙',
        branch: repo.defaultBranch || 'main',
        routesCount: isLocal ? 3 : 1,
        status: isLocal ? 'fixture' : 'cloned',
        statusText: isLocal ? 'Local fixture' : 'Cloned repo',
        description: isLocal
          ? 'Local playground fixture with control test pages'
          : `Imported from github.com/${repo.owner}/${repo.name}`,
        href: isLocal ? '/studio' : `/studio/${encodeURIComponent(repo.id)}`,
        updatedText: repo.importedAt
          ? new Date(repo.importedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })
          : 'Imported recently',
      };
    });

    return [starter, ...repoItems];
  }, [repositories]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      // Tab filter
      if (activeTab === 'starters' && item.type !== 'starter') return false;
      if (activeTab === 'github' && item.type !== 'github') return false;
      if (activeTab === 'local' && item.type !== 'local') return false;

      // Status filter
      if (filterType === 'ready' && item.status !== 'ready') return false;
      if (filterType === 'cloned' && item.status === 'ready') return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(query) ||
          item.owner.toLowerCase().includes(query) ||
          item.branch.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [allItems, activeTab, filterType, searchQuery]);

  const copyShareLink = () => {
    void navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="nt-workspace">
      {/* ---------------- Notion Collapsible Sidebar ---------------- */}
      <aside className={`nt-sidebar ${sidebarCollapsed ? 'is-collapsed' : ''}`} aria-label="Notion workspace sidebar">
        <div className="nt-sidebar-content">
          <div className="nt-sidebar-header">
            <button
              className="nt-workspace-switcher"
              type="button"
              title="SlightNudge Workspace"
              onClick={() => router.push('/')}
            >
              <span className="nt-ws-icon">⚡</span>
              <span className="nt-ws-name">SlightNudge</span>
              <ChevronDown size={14} className="nt-ws-chevron" />
            </button>
            <button
              className="nt-sidebar-collapse-btn"
              type="button"
              aria-label="Collapse sidebar"
              title="Collapse sidebar (Ctrl+\)"
              onClick={() => setSidebarCollapsed(true)}
            >
              <PanelLeftClose size={16} />
            </button>
          </div>

          <button
            className="nt-sidebar-search-btn"
            type="button"
            onClick={() => setQuickFindOpen(true)}
            title="Search workspace (⌘K)"
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Search size={14} />
              <span>Search projects</span>
            </span>
            <span className="nt-kbd-pill">⌘K</span>
          </button>

          <div className="nt-sidebar-body">
            {/* FAVORITES */}
            <div>
              <div className="nt-sidebar-section-title">Favorites</div>
              <div className="nt-sidebar-items">
                <Link href="/studio" className="nt-sidebar-item">
                  <span style={{ fontSize: 13 }}>⚡</span>
                  <span className="nt-sidebar-item-label">SlightNudge Playground</span>
                  <span className="nt-sidebar-item-count">5p</span>
                </Link>
                {repositories.slice(0, 1).map((repo) => (
                  <Link
                    key={repo.id}
                    href={`/studio/${encodeURIComponent(repo.id)}`}
                    className="nt-sidebar-item"
                  >
                    <span style={{ fontSize: 13 }}>{repo.owner === 'local' ? '🧪' : '🐙'}</span>
                    <span className="nt-sidebar-item-label">{repo.name}</span>
                    <span className="nt-sidebar-item-count">{repo.defaultBranch}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* WORKSPACES */}
            <div>
              <div className="nt-sidebar-section-title">Workspace</div>
              <div className="nt-sidebar-items">
                <button
                  type="button"
                  className={`nt-sidebar-item ${activeTab === 'all' ? 'is-active' : ''}`}
                  onClick={() => setActiveTab('all')}
                >
                  <FolderGit2 size={15} />
                  <span className="nt-sidebar-item-label">All Projects</span>
                  <span className="nt-sidebar-item-count">{allItems.length}</span>
                </button>
                <button
                  type="button"
                  className={`nt-sidebar-item ${activeTab === 'starters' ? 'is-active' : ''}`}
                  onClick={() => setActiveTab('starters')}
                >
                  <Sparkles size={15} />
                  <span className="nt-sidebar-item-label">Playground & Starters</span>
                  <span className="nt-sidebar-item-count">1</span>
                </button>
                <button
                  type="button"
                  className={`nt-sidebar-item ${activeTab === 'github' ? 'is-active' : ''}`}
                  onClick={() => setActiveTab('github')}
                >
                  <GitBranch size={15} />
                  <span className="nt-sidebar-item-label">GitHub Repos</span>
                  <span className="nt-sidebar-item-count">
                    {allItems.filter((i) => i.type === 'github').length}
                  </span>
                </button>
                <button
                  type="button"
                  className={`nt-sidebar-item ${activeTab === 'local' ? 'is-active' : ''}`}
                  onClick={() => setActiveTab('local')}
                >
                  <Terminal size={15} />
                  <span className="nt-sidebar-item-label">Local Lab Fixtures</span>
                  <span className="nt-sidebar-item-count">
                    {allItems.filter((i) => i.type === 'local').length}
                  </span>
                </button>
              </div>
            </div>

            {/* QUICK ACTIONS */}
            <div>
              <div className="nt-sidebar-section-title">Actions</div>
              <div className="nt-sidebar-items">
                <button
                  type="button"
                  className="nt-sidebar-item"
                  onClick={() => {
                    setError('');
                    setImportDialogOpen(true);
                  }}
                >
                  <Plus size={15} />
                  <span className="nt-sidebar-item-label">Import from GitHub</span>
                </button>
                <Link href="/studio" className="nt-sidebar-item">
                  <ExternalLink size={15} />
                  <span className="nt-sidebar-item-label">Launch Studio Canvas</span>
                </Link>
              </div>
            </div>
          </div>

          <div className="nt-sidebar-footer">
            <Link href="/" className="nt-sidebar-item" title="Go to SlightNudge marketing home">
              <Home size={15} />
              <span className="nt-sidebar-item-label">Back to Landing Page</span>
            </Link>
            <Link href="/how-it-works" className="nt-sidebar-item" title="Documentation & Guide">
              <BookOpen size={15} />
              <span className="nt-sidebar-item-label">Documentation</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* ---------------- Notion Main Scrollable Canvas ---------------- */}
      <main className="nt-main">
        {/* Top Notion Breadcrumbs Bar */}
        <header className="nt-topbar">
          <div className="nt-topbar-left">
            {sidebarCollapsed && (
              <button
                className="nt-expand-sidebar-btn"
                type="button"
                aria-label="Expand sidebar"
                title="Expand sidebar"
                onClick={() => setSidebarCollapsed(false)}
              >
                <PanelLeft size={16} />
              </button>
            )}
            <nav className="nt-breadcrumbs" aria-label="Breadcrumbs">
              <Link href="/" className="nt-breadcrumb-link">
                <Home size={14} />
                <span>SlightNudge</span>
              </Link>
              <span className="nt-breadcrumb-separator">/</span>
              <span className="nt-breadcrumb-current">
                <span>📁</span>
                <span>Projects</span>
              </span>
            </nav>
          </div>

          <div className="nt-topbar-right">
            <button
              className="nt-topbar-btn"
              type="button"
              onClick={() => setShareDialogOpen(true)}
              title="Share workspace"
            >
              <Share2 size={14} />
              <span>Share</span>
            </button>
            <button
              className={`nt-topbar-btn ${isStarred ? 'is-starred' : ''}`}
              type="button"
              onClick={() => setIsStarred(!isStarred)}
              title={isStarred ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star size={14} fill={isStarred ? 'currentColor' : 'none'} />
            </button>
            <button
              className="nt-topbar-btn"
              type="button"
              onClick={() => setCoverIndex((prev) => (prev + 1) % COVER_GRADIENTS.length)}
              title="Toggle Cover Palette"
            >
              <Clock size={14} />
            </button>
            <button
              className="nt-new-btn"
              type="button"
              onClick={() => {
                setError('');
                setImportDialogOpen(true);
              }}
              title="Add a new project"
            >
              <Plus size={14} />
              <span>New</span>
              <ChevronDown size={12} style={{ opacity: 0.8 }} />
            </button>
          </div>
        </header>

        {/* Notion Cover Banner */}
        <div
          className="nt-cover-banner"
          style={{ background: COVER_GRADIENTS[coverIndex] }}
        >
          <div className="nt-cover-decor" />
          <div className="nt-cover-actions">
            <button
              className="nt-cover-btn"
              type="button"
              onClick={() => setCoverIndex((prev) => (prev + 1) % COVER_GRADIENTS.length)}
            >
              Change cover
            </button>
            <button
              className="nt-cover-btn"
              type="button"
              onClick={() => setCoverIndex(0)}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Notion Page Content Body */}
        <div className="nt-page-body">
          {/* Page Icon */}
          <div className="nt-page-icon-wrapper">
            <div
              className="nt-page-icon"
              title="Workspace icon"
              onClick={() => setCoverIndex((prev) => (prev + 1) % COVER_GRADIENTS.length)}
            >
              📁
            </div>
          </div>

          {/* Page Header */}
          <div className="nt-page-header">
            <h1 className="nt-page-title">Projects</h1>
            <p className="nt-page-desc">
              Your visual design workspace. Open any project to inspect UI components, make focused
              visual tweaks, and update AST source code directly.
            </p>
          </div>

          {/* Notion Page Properties Table */}
          <div className="nt-properties-grid">
            <div className="nt-prop-label">
              <Sparkles size={14} />
              <span>Status</span>
            </div>
            <div className="nt-prop-value">
              <span className="nt-tag nt-tag-green">
                <span className="nt-tag-dot" />
                In Production
              </span>
            </div>

            <div className="nt-prop-label">
              <FolderGit2 size={14} />
              <span>Active Workspaces</span>
            </div>
            <div className="nt-prop-value">
              <span className="nt-tag nt-tag-gray">
                {allItems.length} {allItems.length === 1 ? 'workspace' : 'workspaces'}
              </span>
            </div>

            <div className="nt-prop-label">
              <GitBranch size={14} />
              <span>Default Branch</span>
            </div>
            <div className="nt-prop-value">
              <span className="nt-tag nt-tag-orange">
                <code>main</code>
              </span>
            </div>

            <div className="nt-prop-label">
              <Layers size={14} />
              <span>AST Engine</span>
            </div>
            <div className="nt-prop-value">
              <span className="nt-tag nt-tag-blue">Next.js 14 AST Transformer</span>
            </div>
          </div>

          {/* Notion Callout: SlightNudge Playground */}
          <section className="nt-callout" aria-label="Starter playground template">
            <div className="nt-callout-icon">
              <Sparkles size={16} />
            </div>
            <div className="nt-callout-content">
              <h2 className="nt-callout-title">
                <span>Starter Project: SlightNudge Playground</span>
                <span className="nt-tag nt-tag-green">
                  <span className="nt-tag-dot" />
                  Ready to edit
                </span>
              </h2>
              <p className="nt-callout-text">
                Zero-configuration interactive sandbox with 5 pre-built SaaS pages (Landing, Pricing,
                Dashboard, Cards, Forms). Make visual style adjustments directly on canvas and review
                real-time AST source updates without connecting a git repository.
              </p>
              <div className="nt-callout-actions">
                <Link href="/studio" className="nt-callout-cta">
                  <span>Open Playground in Studio</span>
                  <ArrowUpRight size={14} />
                </Link>
                <span className="nt-tag nt-tag-blue">5 pages included</span>
                <span className="nt-tag nt-tag-gray">Local fixture</span>
              </div>
            </div>
          </section>

          {/* Notion Database Toolbar */}
          <div className="nt-db-toolbar">
            <div className="nt-db-views" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'all'}
                className={`nt-db-tab ${activeTab === 'all' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                <span>⊞</span>
                <span>All Projects</span>
                <span className="nt-tab-count">({allItems.length})</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'starters'}
                className={`nt-db-tab ${activeTab === 'starters' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('starters')}
              >
                <span>⚡</span>
                <span>Starters</span>
                <span className="nt-tab-count">(1)</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'github'}
                className={`nt-db-tab ${activeTab === 'github' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('github')}
              >
                <span>🐙</span>
                <span>GitHub</span>
                <span className="nt-tab-count">
                  ({allItems.filter((i) => i.type === 'github').length})
                </span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'local'}
                className={`nt-db-tab ${activeTab === 'local' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('local')}
              >
                <span>🧪</span>
                <span>Local Fixtures</span>
                <span className="nt-tab-count">
                  ({allItems.filter((i) => i.type === 'local').length})
                </span>
              </button>
            </div>

            <div className="nt-db-actions">
              {/* Search input */}
              <div className="nt-search-input-wrap">
                <Search size={13} />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                    onClick={() => setSearchQuery('')}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* View Switcher: Gallery, Table, Board */}
              <div className="nt-viewmode-toggle" title="Switch view layout">
                <button
                  type="button"
                  className={`nt-viewmode-btn ${viewMode === 'gallery' ? 'is-active' : ''}`}
                  onClick={() => setViewMode('gallery')}
                  title="Gallery view"
                >
                  <LayoutGrid size={14} />
                </button>
                <button
                  type="button"
                  className={`nt-viewmode-btn ${viewMode === 'table' ? 'is-active' : ''}`}
                  onClick={() => setViewMode('table')}
                  title="Table view"
                >
                  <Table size={14} />
                </button>
                <button
                  type="button"
                  className={`nt-viewmode-btn ${viewMode === 'board' ? 'is-active' : ''}`}
                  onClick={() => setViewMode('board')}
                  title="Board view"
                >
                  <Kanban size={14} />
                </button>
              </div>

              {/* + New Button */}
              <button
                type="button"
                className="nt-new-btn"
                onClick={() => {
                  setError('');
                  setImportDialogOpen(true);
                }}
              >
                <Plus size={13} />
                <span>New</span>
              </button>
            </div>
          </div>

          {/* Database Content: Gallery / Table / Board */}
          {filteredItems.length === 0 ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                border: '1px dashed rgba(55,53,47,0.15)',
                borderRadius: 8,
                background: '#fbfbfa',
              }}
            >
              <p style={{ margin: 0, fontSize: 14, color: '#787774' }}>
                No projects found matching &ldquo;{searchQuery}&rdquo;
              </p>
              <button
                type="button"
                className="nt-topbar-btn"
                style={{ marginTop: 12, display: 'inline-flex' }}
                onClick={() => {
                  setSearchQuery('');
                  setActiveTab('all');
                }}
              >
                Clear filters
              </button>
            </div>
          ) : viewMode === 'gallery' ? (
            /* 1. GALLERY VIEW */
            <div className="nt-gallery-grid">
              {filteredItems.map((item) => (
                <Link key={item.id} href={item.href} className="nt-card">
                  <div
                    className="nt-card-cover"
                    style={{
                      background:
                        item.type === 'starter'
                          ? 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)'
                          : item.type === 'github'
                            ? 'linear-gradient(135deg, #ede7f6 0%, #d1c4e9 100%)'
                            : 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                    }}
                  >
                    <div className="nt-card-cover-pattern" />
                    <span style={{ fontSize: 32, position: 'relative', zIndex: 1 }}>{item.icon}</span>
                    <div className="nt-card-cover-badge">
                      <span
                        className={`nt-tag ${item.status === 'ready'
                            ? 'nt-tag-green'
                            : item.type === 'github'
                              ? 'nt-tag-purple'
                              : 'nt-tag-yellow'
                          }`}
                      >
                        {item.statusText}
                      </span>
                    </div>
                  </div>

                  <div className="nt-card-body">
                    <div className="nt-card-title-row">
                      <span className="nt-card-icon">{item.icon}</span>
                      <h3 className="nt-card-title">{item.name}</h3>
                    </div>

                    <div className="nt-card-tags">
                      <span className="nt-tag nt-tag-gray">
                        <GitBranch size={11} />
                        {item.branch}
                      </span>
                      <span className="nt-tag nt-tag-blue">
                        {item.routesCount} {item.routesCount === 1 ? 'route' : 'routes'}
                      </span>
                      {item.type === 'github' && (
                        <span className="nt-tag nt-tag-purple">
                          <Globe size={11} />
                          GitHub
                        </span>
                      )}
                    </div>

                    <p
                      style={{
                        margin: '0 0 12px 0',
                        fontSize: 12,
                        color: '#787774',
                        lineHeight: 1.45,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {item.description}
                    </p>

                    <div className="nt-card-footer">
                      <span>{item.updatedText}</span>
                      <span className="nt-card-open">
                        <span>Open Studio</span>
                        <ArrowUpRight size={13} />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : viewMode === 'table' ? (
            /* 2. TABLE VIEW */
            <div className="nt-table-wrap">
              <table className="nt-table">
                <thead>
                  <tr>
                    <th>
                      <div>
                        <span>Aa</span>
                        <span>Name</span>
                      </div>
                    </th>
                    <th>
                      <div>
                        <span>🏷</span>
                        <span>Status</span>
                      </div>
                    </th>
                    <th>
                      <div>
                        <span>🔗</span>
                        <span>Source</span>
                      </div>
                    </th>
                    <th>
                      <div>
                        <GitBranch size={12} />
                        <span>Branch</span>
                      </div>
                    </th>
                    <th>
                      <div>
                        <FileCode2 size={12} />
                        <span>Routes</span>
                      </div>
                    </th>
                    <th>
                      <div>
                        <Calendar size={12} />
                        <span>Updated</span>
                      </div>
                    </th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <Link href={item.href} className="nt-table-link">
                          <span>{item.icon}</span>
                          <span>{item.name}</span>
                        </Link>
                      </td>
                      <td>
                        <span
                          className={`nt-tag ${item.status === 'ready'
                              ? 'nt-tag-green'
                              : item.type === 'github'
                                ? 'nt-tag-purple'
                                : 'nt-tag-yellow'
                            }`}
                        >
                          <span className="nt-tag-dot" />
                          {item.statusText}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`nt-tag ${item.type === 'starter'
                              ? 'nt-tag-blue'
                              : item.type === 'github'
                                ? 'nt-tag-purple'
                                : 'nt-tag-gray'
                            }`}
                        >
                          {item.type === 'starter'
                            ? 'Starter Demo'
                            : item.type === 'github'
                              ? 'GitHub Repo'
                              : 'Local Fixture'}
                        </span>
                      </td>
                      <td>
                        <code style={{ fontSize: 11, color: '#69756f' }}>{item.branch}</code>
                      </td>
                      <td>
                        <span style={{ fontSize: 12, color: '#787774' }}>
                          {item.routesCount} {item.routesCount === 1 ? 'page' : 'pages'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: 12, color: '#9b9a97' }}>{item.updatedText}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link
                          href={item.href}
                          className="nt-topbar-btn"
                          style={{
                            display: 'inline-flex',
                            color: '#176b55',
                            fontWeight: 600,
                          }}
                        >
                          <span>Open</span>
                          <ArrowUpRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="nt-table-foot">
                <span>Count {filteredItems.length}</span>
                <span>Calculate: Count all</span>
              </div>
            </div>
          ) : (
            /* 3. BOARD VIEW */
            <div className="nt-board-wrap">
              {/* Column 1: Ready to Edit */}
              <div className="nt-board-column">
                <div className="nt-board-col-header">
                  <span className="nt-tag nt-tag-green">
                    <span className="nt-tag-dot" />
                    Ready to Edit
                  </span>
                  <span style={{ color: '#9b9a97', fontSize: 11 }}>
                    {filteredItems.filter((i) => i.status === 'ready').length}
                  </span>
                </div>
                <div className="nt-board-col-cards">
                  {filteredItems
                    .filter((i) => i.status === 'ready')
                    .map((item) => (
                      <Link key={item.id} href={item.href} className="nt-board-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span>{item.icon}</span>
                          <strong style={{ fontSize: 13, color: '#37352f' }}>{item.name}</strong>
                        </div>
                        <p style={{ margin: 0, fontSize: 12, color: '#787774', lineHeight: 1.4 }}>
                          {item.description}
                        </p>
                        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                          <span className="nt-tag nt-tag-blue">{item.routesCount} pages</span>
                          <span className="nt-tag nt-tag-gray">{item.branch}</span>
                        </div>
                      </Link>
                    ))}
                </div>
              </div>

              {/* Column 2: Cloned Repositories */}
              <div className="nt-board-column">
                <div className="nt-board-col-header">
                  <span className="nt-tag nt-tag-purple">
                    <span className="nt-tag-dot" />
                    Imported Repos
                  </span>
                  <span style={{ color: '#9b9a97', fontSize: 11 }}>
                    {filteredItems.filter((i) => i.type === 'github').length}
                  </span>
                </div>
                <div className="nt-board-col-cards">
                  {filteredItems
                    .filter((i) => i.type === 'github')
                    .map((item) => (
                      <Link key={item.id} href={item.href} className="nt-board-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span>{item.icon}</span>
                          <strong style={{ fontSize: 13, color: '#37352f' }}>{item.name}</strong>
                        </div>
                        <p style={{ margin: 0, fontSize: 12, color: '#787774', lineHeight: 1.4 }}>
                          {item.description}
                        </p>
                        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                          <span className="nt-tag nt-tag-purple">GitHub</span>
                          <span className="nt-tag nt-tag-gray">{item.branch}</span>
                        </div>
                      </Link>
                    ))}
                  {filteredItems.filter((i) => i.type === 'github').length === 0 && (
                    <div
                      style={{
                        padding: 16,
                        textAlign: 'center',
                        fontSize: 12,
                        color: '#9b9a97',
                        border: '1px dashed rgba(55,53,47,0.1)',
                        borderRadius: 6,
                      }}
                    >
                      No GitHub repos yet
                    </div>
                  )}
                </div>
              </div>

              {/* Column 3: Local Lab Fixtures */}
              <div className="nt-board-column">
                <div className="nt-board-col-header">
                  <span className="nt-tag nt-tag-yellow">
                    <span className="nt-tag-dot" />
                    Local Fixtures
                  </span>
                  <span style={{ color: '#9b9a97', fontSize: 11 }}>
                    {filteredItems.filter((i) => i.type === 'local').length}
                  </span>
                </div>
                <div className="nt-board-col-cards">
                  {filteredItems
                    .filter((i) => i.type === 'local')
                    .map((item) => (
                      <Link key={item.id} href={item.href} className="nt-board-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span>{item.icon}</span>
                          <strong style={{ fontSize: 13, color: '#37352f' }}>{item.name}</strong>
                        </div>
                        <p style={{ margin: 0, fontSize: 12, color: '#787774', lineHeight: 1.4 }}>
                          {item.description}
                        </p>
                        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                          <span className="nt-tag nt-tag-yellow">Local</span>
                          <span className="nt-tag nt-tag-gray">{item.branch}</span>
                        </div>
                      </Link>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ---------------- Notion Import Modal ---------------- */}
      {importDialogOpen && (
        <div
          className="nt-modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !loading) setImportDialogOpen(false);
          }}
        >
          <div className="nt-modal" role="dialog" aria-modal="true" aria-labelledby="modal-import-title">
            <div className="nt-modal-head">
              <h2 id="modal-import-title" className="nt-modal-title">
                <span>🐙</span>
                <span>Import repository from GitHub</span>
              </h2>
              <button
                type="button"
                className="nt-modal-close"
                onClick={() => !loading && setImportDialogOpen(false)}
                aria-label="Close dialog"
              >
                <X size={16} />
              </button>
            </div>

            <div className="nt-modal-body">
              <p style={{ margin: '0 0 16px 0', fontSize: 13, color: '#787774', lineHeight: 1.5 }}>
                SlightNudge will clone the public repository locally so you can inspect and visually edit its
                Next.js components. No code is pushed without your review.
              </p>

              <form onSubmit={importRepository}>
                <label
                  htmlFor="repo-url-input"
                  style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#37352f', marginBottom: 6 }}
                >
                  GitHub Repository URL
                </label>
                <div className="nt-search-input-wrap" style={{ height: 40, width: '100%', padding: '0 12px' }}>
                  <GitBranch size={15} />
                  <input
                    id="repo-url-input"
                    type="url"
                    required
                    autoFocus
                    placeholder="https://github.com/owner/repository"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    style={{ width: '100%', fontSize: 13 }}
                  />
                </div>

                {error && (
                  <p style={{ margin: '8px 0 0', fontSize: 12, color: '#e03e3e' }}>{error}</p>
                )}

                <div style={{ marginTop: 14 }}>
                  <span style={{ fontSize: 11, color: '#9b9a97', fontWeight: 500 }}>Quick samples:</span>
                  <div className="nt-chip-list">
                    <button
                      type="button"
                      className="nt-chip"
                      onClick={() => setRepoUrl('https://github.com/vercel/next-learn-starter')}
                    >
                      vercel/next-learn-starter
                    </button>
                    <button
                      type="button"
                      className="nt-chip"
                      onClick={() => setRepoUrl('https://github.com/shadcn/ui')}
                    >
                      shadcn/ui
                    </button>
                    <button
                      type="button"
                      className="nt-chip"
                      onClick={() => setRepoUrl('https://github.com/tailwindlabs/heroicons')}
                    >
                      tailwindlabs/heroicons
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 8,
                    marginTop: 22,
                  }}
                >
                  <button
                    type="button"
                    className="nt-topbar-btn"
                    onClick={() => setImportDialogOpen(false)}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="nt-new-btn"
                    style={{ height: 32, padding: '0 14px' }}
                    disabled={loading || !repoUrl.trim()}
                  >
                    {loading ? (
                      <>
                        <LoaderCircle size={14} className="sn-spinner" />
                        <span>Cloning repository...</span>
                      </>
                    ) : (
                      <>
                        <span>Clone and Open Studio</span>
                        <ArrowUpRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            <div className="nt-modal-foot">
              <span style={{ fontSize: 11, color: '#787774', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check size={13} style={{ color: '#2b593f' }} />
                Files remain safely on this local machine.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Notion Share Modal ---------------- */}
      {shareDialogOpen && (
        <div
          className="nt-modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShareDialogOpen(false);
          }}
        >
          <div className="nt-modal" role="dialog" aria-modal="true">
            <div className="nt-modal-head">
              <h2 className="nt-modal-title">
                <Share2 size={16} />
                <span>Share Workspace</span>
              </h2>
              <button
                type="button"
                className="nt-modal-close"
                onClick={() => setShareDialogOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="nt-modal-body">
              <p style={{ margin: '0 0 14px 0', fontSize: 13, color: '#787774', lineHeight: 1.5 }}>
                Share this local SlightNudge workspace URL with teammates running on your local network.
              </p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  background: '#fbfbfa',
                  border: '1px solid rgba(55,53,47,0.1)',
                  borderRadius: 6,
                }}
              >
                <input
                  type="text"
                  readOnly
                  value={typeof window !== 'undefined' ? window.location.href : 'http://localhost:3000/workspace'}
                  style={{
                    flex: 1,
                    border: 'none',
                    background: 'transparent',
                    fontSize: 12,
                    color: '#37352f',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  className="nt-topbar-btn"
                  onClick={copyShareLink}
                  style={{ flex: 'none', background: copiedLink ? '#edf3ec' : '#ffffff' }}
                >
                  {copiedLink ? <Check size={13} style={{ color: '#2b593f' }} /> : <Copy size={13} />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Notion Quick Find (⌘K) Modal ---------------- */}
      {quickFindOpen && (
        <div
          className="nt-modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setQuickFindOpen(false);
          }}
        >
          <div className="nt-modal" role="dialog" aria-modal="true" style={{ width: 560 }}>
            <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(55,53,47,0.08)', padding: '0 12px' }}>
              <Search size={16} style={{ color: '#787774', flex: 'none' }} />
              <input
                type="text"
                className="nt-quickfind-input"
                autoFocus
                placeholder="Search projects, routes, or pages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="nt-kbd-pill">ESC</span>
            </div>
            <div className="nt-quickfind-results">
              <div style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, color: '#9b9a97', textTransform: 'uppercase' }}>
                Projects ({filteredItems.length})
              </div>
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="nt-quickfind-item"
                  onClick={() => {
                    setQuickFindOpen(false);
                    router.push(item.href);
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{item.icon}</span>
                    <div>
                      <strong style={{ fontSize: 13, color: '#37352f' }}>{item.name}</strong>
                      <span style={{ fontSize: 11, color: '#787774', marginLeft: 8 }}>{item.statusText}</span>
                    </div>
                  </div>
                  <ChevronRight size={14} style={{ color: '#9b9a97' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
