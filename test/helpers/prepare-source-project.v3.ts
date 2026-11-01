import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createSaasSample } from './create-saas-sample.v3';

export function prepareSourceProject(root: string, workspace: string, repo: string, env: NodeJS.ProcessEnv) {
  const selected = process.argv.find(arg => arg.startsWith('--public='))?.split('=')[1];
  const urls: Record<string, string> = { '2': 'https://github.com/bennyjoel/nextjs-saas-starter-lite', '3': 'https://github.com/EdgeOneDev/saas-starter', 'next-saas': 'https://github.com/nextjs/saas-starter', 'open-react': 'https://github.com/cruip/open-react-template' };
  if (selected) {
    const url = urls[selected]; if (!url) throw new Error('Choose public project 2, 3, next-saas, or open-react.');
    execFileSync('git', ['-c', 'credential.helper=', 'clone', '--depth', '1', '--no-checkout', url, repo], { cwd: workspace, env, stdio: 'pipe' });
    const files = execFileSync('git', ['ls-tree', '-r', '--name-only', 'HEAD'], { cwd: repo, env, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean).filter(file => !/(^|\/)\.env(?:\.|$)|secret|credential|\.(pem|key)$/i.test(file));
    for (let i = 0; i < files.length; i += 40) execFileSync('git', ['checkout', 'HEAD', '--', ...files.slice(i, i + 40)], { cwd: repo, env, stdio: 'ignore' });
    // Some templates declare their license in README instead of a separate
    // root file. These checkouts are disposable and are never product assets.
    const declaredInReadme = files.filter(file => /^readme(?:\.md|\.txt)?$/i.test(file)).some(file => /(?:terms and licen[sc]e|released under the\s+\[?(?:MIT|GPL|Apache|BSD))/i.test(fs.readFileSync(path.join(repo, file), 'utf8')));
    if (!files.some(file => /^licen[sc]e(?:\.|$)/i.test(file)) && !declaredInReadme) throw new Error('Skip: no root license declaration found.');
    const npm = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
    execFileSync(process.execPath, [npm, 'install', '--ignore-scripts', '--no-audit', '--no-fund', '--legacy-peer-deps', '--prefer-offline'], { cwd: repo, env, timeout: 600000, stdio: 'pipe' });
  } else {
    const versions: Record<string, string> = {};
    for (const name of ['next', 'react', 'tailwindcss', '@tailwindcss/postcss', 'typescript', '@types/react', '@types/node']) versions[name] = JSON.parse(fs.readFileSync(path.join(root, 'node_modules', name, 'package.json'), 'utf8')).version;
    createSaasSample(repo, versions);
    execFileSync('git', ['init', '--quiet'], { cwd: repo, env });
    execFileSync('git', ['-c', 'core.autocrlf=false', 'add', 'app', 'components', 'package.json', 'LICENSE'], { cwd: repo, env, stdio: 'ignore' });
    fs.symlinkSync(path.join(root, 'node_modules'), path.join(repo, 'node_modules'), 'junction');
  }
  fs.writeFileSync(path.join(workspace, '.slightnudge/repositories.json'), JSON.stringify([{ id: 'source-proof', localPath: repo, name: 'Disposable source project', owner: 'test' }]));
  execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', "const {installNextSourceAdapter}=await import('./lib/slightnudge/next-source-adapter.ts');await installNextSourceAdapter('source-proof');"], { cwd: workspace, env, timeout: 30000, stdio: 'pipe' });
  const version = (name: string) => JSON.parse(fs.readFileSync(path.join(repo, 'node_modules', name, 'package.json'), 'utf8')).version;
  const devHelp = execFileSync(process.execPath, [path.join(repo, 'node_modules/next/dist/bin/next'), 'dev', '--help'], { cwd: repo, env, encoding: 'utf8', timeout: 30000 });
  const webpackArgs = devHelp.includes('--webpack') ? ['--webpack'] : [];
  fs.writeFileSync(path.join(root, `docs/source-project-compat-${selected || 'sample'}.json`), JSON.stringify({ project: selected ? urls[selected] : 'generated SaaS', next: version('next'), tailwind: version('tailwindcss'), lockfiles: ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'].filter(name => fs.existsSync(path.join(repo, name))), routes: ['app', 'src/app', 'pages', 'src/pages'].filter(name => fs.existsSync(path.join(repo, name))), adapterInstalled: true, vite: 'unsupported', secretsCheckedOut: false }, null, 2));
  console.log(`Disposable source project: ${selected ? urls[selected] : 'generated SaaS'}; Next.js ${version('next')}; Tailwind ${version('tailwindcss')}; installed source adapter; no environment files checked out.`);
  return { selected, next: version('next'), tailwind: version('tailwindcss'), webpackArgs, root: repo, url: selected ? urls[selected] : 'generated SaaS', commit: selected ? execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8', env }).trim() : undefined };
}
