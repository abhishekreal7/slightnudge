import fs from 'fs';
import path from 'path';

const REPO_MAP = {
  'taxonomy': 'shadcn-ui/taxonomy',
  'precedent': 'steven-tey/precedent',
  'platforms': 'vercel/platforms',
  'tremor': 'tremorlabs/tremor',
  'create-t3-app': 't3-oss/create-t3-app',
  'leerob-site': 'leerob/leerob.io',
  'tailwind-starter-blog': 'timlrx/tailwind-nextjs-starter-blog',
  'shadcn-ui': 'shadcn-ui/ui',
  'covid-vacuna': 'midudev/covid-vacuna',
  'nextjs-boilerplate': 'ixartz/Next-js-Boilerplate',
  'shadcn-table': 'sadmann7/shadcn-table',
  'terminal-portfolio': 'satnaing/terminal-portfolio',
  'bulletproof-react': 'alan2207/bulletproof-react',
  'shadcn-next-template': 'shadcn-ui/next-template',
  'commerce': 'vercel/commerce',
  'tailwindcss-com': 'tailwindlabs/tailwindcss.com',
  'headlessui': 'tailwindlabs/headlessui',
  'react-tweet': 'vercel/react-tweet',
  'nextra': 'shuding/nextra',
  'cmdk': 'pacocoursey/cmdk',
  'tremor-raw': 'tremorlabs/raw',
  'tailwind-heropatterns': 'tailwindlabs/heroicons',
  'formik': 'jaredpalmer/formik',
  'swr': 'vercel/swr',
  'zustand': 'pmndrs/zustand',
  'twitterbio': 'Nutlope/twitterbio',
  'roomgpt': 'Nutlope/roomGPT',
  'infisical': 'Infisical/infisical',
  'calcom': 'calcom/cal.com',
  'dub': 'dubinc/dub',
  'chatbot-ui': 'mckaywrigley/chatbot-ui',
  'shadcn-ui-sidebar': 'salvia-kit/shadcn-ui-sidebar'
};

export async function fetchDiff(repoKey, sha, outDir = 'scratch/diffs') {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outFile = path.join(outDir, `${repoKey}-${sha}.diff`);
  if (fs.existsSync(outFile) && fs.statSync(outFile).size > 0) {
    return fs.readFileSync(outFile, 'utf8');
  }

  const githubRepo = REPO_MAP[repoKey] || repoKey;
  const url = `https://github.com/${githubRepo}/commit/${sha}.diff`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'VibeCheck-Coverage-Audit/1.0'
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const diffText = await res.text();
    fs.writeFileSync(outFile, diffText, 'utf8');
    return diffText;
  } catch (err) {
    console.error(`Failed to fetch diff for ${repoKey}@${sha}:`, err.message);
    return null;
  }
}
