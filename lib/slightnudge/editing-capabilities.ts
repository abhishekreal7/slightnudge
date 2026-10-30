import type { ProjectCompatibility } from './project-compatibility';

export interface EditingCapability {
  id: 'text' | 'styles' | 'responsive' | 'generated';
  label: string;
  state: 'available' | 'setup' | 'limited' | 'unsupported';
  detail: string;
}

/** Metadata guidance, never a claim that an individual element has passed. */
export function editingCapabilities(report: ProjectCompatibility): { items: EditingCapability[]; nextStep: string } {
  const mapping = report.checks.find(check => check.id === 'framework');
  const styles = report.checks.find(check => check.id === 'styles');
  const ready = report.sourceMapping && mapping?.state === 'available';
  const state = !report.sourceMapping ? 'unsupported' : !ready ? 'setup' : 'available';
  const styleState = state !== 'available' ? state : styles?.state === 'available' ? 'available' : styles?.state === 'setup' ? 'setup' : 'limited';
  return {
    nextStep: !report.sourceMapping ? mapping?.detail || 'Choose a supported Next.js application.'
      : !ready ? 'Install dependencies in this app’s folder, then reopen project setup to check the installed runtime.'
      : report.router !== 'app' ? 'Connect a Webpack development preview and try one static element first. This page structure has not completed editing qualification.'
      : 'Enable source mapping, restart the app with Webpack, and connect its local preview. Each edit is verified before it enters your draft.',
    items: [
      { id: 'text', label: 'Text and button labels', state, detail: state === 'available' ? 'Literal JSX text can be edited in place after connection. Button icons and destinations are preserved.' : state === 'setup' ? 'Install the app’s dependencies before connecting source editing.' : 'Source text editing requires a supported Next.js application.' },
      { id: 'styles', label: 'Appearance and layout', state: styleState, detail: styleState === 'available' ? 'Literal Tailwind classes support typography, spacing, sizing and layout. The project’s CSS must confirm the result.' : styleState === 'setup' ? 'Install the declared compiler before checking style edits.' : styleState === 'unsupported' ? 'The source adapter is unavailable for this framework or version.' : 'CSS modules, CSS-in-JS and arbitrary styles are preserved; install a supported Tailwind compiler for utility edits.' },
      { id: 'responsive', label: 'Responsive styles', state: styleState, detail: styleState === 'available' ? 'Breakpoints come from the installed compiler. Choose a matching preview width to edit that scope.' : 'Responsive utility editing needs source mapping and an installed Tailwind 3 or 4 compiler.' },
      { id: 'generated', label: 'Generated and shared content', state: 'limited', detail: 'Translations, prop-driven labels, repeated components and dynamic classes may need changes in code. Unsupported edits explain the reason before changing source.' },
    ],
  };
}

export function nextDevCommand(version?: string): string {
  const [major, minor] = (version || '').split('.').map(Number);
  // Next 14/early 15 use Webpack by default and do not accept --webpack.
  const flag = major >= 16 || major === 15 && minor >= 6 ? ' --webpack' : '';
  return `npx next dev${flag} --hostname 127.0.0.1 --port 3001`;
}
