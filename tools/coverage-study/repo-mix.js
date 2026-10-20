import fs from 'fs';
import path from 'path';

export const REPOS_METADATA = {
  // App / Template / UI-Kit
  'taxonomy': { type: 'app/template', desc: 'Next.js SaaS starter app (shadcn)' },
  'precedent': { type: 'app/template', desc: 'Next.js starter template (Steven Tey)' },
  'platforms': { type: 'app/template', desc: 'Multi-tenant SaaS starter kit (Vercel)' },
  'leerob-site': { type: 'app/template', desc: 'Personal portfolio web app (Lee Robinson)' },
  'tailwind-starter-blog': { type: 'app/template', desc: 'Next.js blog starter template (Timothy Lin)' },
  'nextjs-boilerplate': { type: 'app/template', desc: 'Next.js developer boilerplate (ixartz)' },
  'shadcn-table': { type: 'app/template', desc: 'Data table component demo app (sadmann7)' },
  'shadcn-landing-page': { type: 'app/template', desc: 'Landing page template (leoMirandaa)' },
  'covid-vacuna': { type: 'app/template', desc: 'COVID vaccination tracking app (midudev)' },
  'terminal-portfolio': { type: 'app/template', desc: 'Terminal portfolio web app (Sat Naing)' },
  'bulletproof-react': { type: 'app/template', desc: 'React architecture showcase app' },
  'shadcn-next-template': { type: 'app/template', desc: 'Next.js 13 template' },
  'chatbot-ui': { type: 'app/template', desc: 'AI chat interface web app (mckaywrigley)' },
  'commerce': { type: 'app/template', desc: 'Next.js e-commerce demo site (Vercel)' },
  'shadcn-ui-sidebar': { type: 'app/template', desc: 'Admin sidebar template app' },
  'tailwindcss-com': { type: 'app/template', desc: 'Tailwind CSS documentation site' },
  'twitterbio': { type: 'app/template', desc: 'AI bio generator web app (Nutlope)' },
  'roomgpt': { type: 'app/template', desc: 'AI room interior design app (Nutlope)' },

  // Library / Tooling
  'tremor': { type: 'library/tooling', desc: 'React component library (Tremor Labs)' },
  'create-t3-app': { type: 'library/tooling', desc: 'CLI scaffolding tool & docs (T3 Open Source)' },
  'shadcn-ui': { type: 'library/tooling', desc: 'Component distribution CLI & library (shadcn)' },
  'headlessui': { type: 'library/tooling', desc: 'Unstyled UI components library (Tailwind Labs)' },
  'tremor-raw': { type: 'library/tooling', desc: 'Copy-paste component primitives (Tremor)' },
  'tailwind-heropatterns': { type: 'library/tooling', desc: 'SVG icon library (heroicons)' },
  'react-tweet': { type: 'library/tooling', desc: 'React tweet embed library (Vercel)' },
  'formik': { type: 'library/tooling', desc: 'Form state management library' },
  'nextra': { type: 'library/tooling', desc: 'Next.js static site generator / docs framework' },
  'cmdk': { type: 'library/tooling', desc: 'Command menu React component library (Paco)' },
  'swr': { type: 'library/tooling', desc: 'Data fetching React hooks library (Vercel)' },
  'zustand': { type: 'library/tooling', desc: 'State management library (Poimandres)' }
};

export function analyzeRepoMix(dataPath = path.resolve('tools/coverage-study/data/parsed-study.json')) {
  const rows = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  const repoCounts = {};
  for (const [r, meta] of Object.entries(REPOS_METADATA)) {
    repoCounts[r] = {
      ...meta,
      count: 0,
      reproduced: 0,
      partial: 0,
      refused: 0,
      unsupported: 0
    };
  }

  rows.forEach(row => {
    if (!repoCounts[row.repo]) {
      console.warn(`Encountered unknown repo in rows: ${row.repo}`);
      repoCounts[row.repo] = {
        type: 'app/template',
        desc: 'Unlisted repo',
        count: 0,
        reproduced: 0,
        partial: 0,
        refused: 0,
        unsupported: 0
      };
    }
    repoCounts[row.repo].count++;
    if (row.verdict === 'REPRODUCED') repoCounts[row.repo].reproduced++;
    if (row.verdict === 'PARTIAL') repoCounts[row.repo].partial++;
    if (row.verdict === 'REFUSED') repoCounts[row.repo].refused++;
    if (row.verdict === 'UNSUPPORTED') repoCounts[row.repo].unsupported++;
  });

  const flaggedLowCount = [];
  let appCommits = 0;
  let appReproduced = 0;
  let libCommits = 0;
  let libReproduced = 0;

  for (const [name, stats] of Object.entries(repoCounts)) {
    if (stats.count < 5) {
      flaggedLowCount.push({ name, count: stats.count, type: stats.type, desc: stats.desc });
    }
    if (stats.type === 'library/tooling') {
      libCommits += stats.count;
      libReproduced += stats.reproduced;
    } else {
      appCommits += stats.count;
      appReproduced += stats.reproduced;
    }
  }

  return {
    repoCounts,
    flaggedLowCount,
    overall: {
      total: rows.length,
      reproduced: rows.filter(r => r.verdict === 'REPRODUCED').length,
      rate: (rows.filter(r => r.verdict === 'REPRODUCED').length / rows.length * 100).toFixed(2) + '%'
    },
    appOnly: {
      total: appCommits,
      reproduced: appReproduced,
      rate: (appReproduced / appCommits * 100).toFixed(2) + '%'
    },
    libraryOnly: {
      total: libCommits,
      reproduced: libReproduced,
      rate: (libReproduced / libCommits * 100).toFixed(2) + '%'
    }
  };
}

if (process.argv[1] && process.argv[1].endsWith('repo-mix.js')) {
  const res = analyzeRepoMix();
  console.log('Repo Mix Summary:');
  console.log(`Total Repositories: ${Object.keys(res.repoCounts).length}`);
  console.log(`Overall Coverage: ${res.overall.reproduced} / ${res.overall.total} (${res.overall.rate})`);
  console.log(`App/Template Coverage (excluding libraries): ${res.appOnly.reproduced} / ${res.appOnly.total} (${res.appOnly.rate})`);
  console.log(`Library Coverage: ${res.libraryOnly.reproduced} / ${res.libraryOnly.total} (${res.libraryOnly.rate})`);
  console.log(`\nFlagged Repos with < 5 Commits (${res.flaggedLowCount.length} of 30 repos):`);
  res.flaggedLowCount.forEach(f => {
    console.log(`  • [${f.count} commits] ${f.name} (${f.type}): ${f.desc}`);
  });
}
