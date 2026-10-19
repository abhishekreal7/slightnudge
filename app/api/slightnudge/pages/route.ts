import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

export interface DiscoveredPage {
  id: string;
  title: string;
  route: string;
  file: string;
  type: 'app' | 'fixture';
  isAutoDetected: boolean;
  status: 'ready' | 'draft';
}

function scanAppDirectory(dir: string, baseRoute = ''): DiscoveredPage[] {
  let pages: DiscoveredPage[] = [];
  if (!fs.existsSync(dir)) return pages;

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      // Skip internal folders, api, hidden folders
      if (
        entry.name.startsWith('_') ||
        entry.name.startsWith('.') ||
        entry.name === 'api' ||
        entry.name === 'node_modules'
      ) {
        continue;
      }

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Handle route groups like (marketing) without adding them to url
        const isRouteGroup = entry.name.startsWith('(') && entry.name.endsWith(')');
        const segment = isRouteGroup ? '' : entry.name;
        const nextRoute = segment
          ? baseRoute === '/'
            ? `/${segment}`
            : `${baseRoute}/${segment}`
          : baseRoute;

        pages = pages.concat(scanAppDirectory(fullPath, nextRoute || '/'));
      } else if (/^page\.(tsx|jsx|js)$/.test(entry.name)) {
        const relPath = path.relative(process.cwd(), fullPath).split(path.sep).join('/');
        const routePath = baseRoute || '/';

        // Clean user-friendly title
        let title = 'Home';
        if (routePath !== '/') {
          const parts = routePath.split('/').filter(Boolean);
          const lastPart = parts[parts.length - 1];
          title = lastPart
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
        }

        pages.push({
          id: routePath === '/' ? 'home' : routePath.replace(/^\//, '').replace(/\//g, '-'),
          title,
          route: routePath,
          file: relPath,
          type: 'app',
          isAutoDetected: true,
          status: 'ready',
        });
      }
    }
  } catch (error) {
    console.error('Error scanning app routes:', error);
  }

  return pages;
}

function scanFixtures(): DiscoveredPage[] {
  const fixturesDir = path.join(process.cwd(), 'fixtures');
  if (!fs.existsSync(fixturesDir)) return [];

  try {
    return fs
      .readdirSync(fixturesDir)
      .filter((file) => file.endsWith('.tsx') || file.endsWith('.jsx'))
      .map((file, idx) => {
        const num = file.split('-')[0] || String(idx + 1);
        const namePart = file.replace(/^[0-9]+-/, '').replace(/\.(tsx|jsx)$/, '');
        const title = namePart
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

        return {
          id: `fixture-${num}`,
          title: title || `Fixture ${num}`,
          route: `/fixtures/${num}`,
          file: `fixtures/${file}`,
          type: 'fixture' as const,
          isAutoDetected: true,
          status: 'ready' as const,
        };
      });
  } catch {
    return [];
  }
}

export async function GET() {
  const appPages = scanAppDirectory(path.join(process.cwd(), 'app'), '');
  const fixturePages = scanFixtures();

  // Sort app pages: Home first, then alphabetical, excluding studio itself from editing itself
  const filteredAppPages = appPages
    .filter((p) => p.route !== '/studio' && !p.route.startsWith('/studio/'))
    .sort((a, b) => {
      if (a.route === '/') return -1;
      if (b.route === '/') return 1;
      return a.title.localeCompare(b.title);
    });

  return NextResponse.json({
    success: true,
    framework: 'Next.js App Router',
    autoDetectedCount: filteredAppPages.length + fixturePages.length,
    appPages: filteredAppPages,
    fixturePages,
    allPages: [...filteredAppPages, ...fixturePages],
    scannedAt: new Date().toISOString(),
  });
}
