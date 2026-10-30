import type { ProjectCompatibility as Report } from '@/lib/slightnudge/project-compatibility';
import { editingCapabilities } from '@/lib/slightnudge/editing-capabilities';
import { Type, SlidersHorizontal, Monitor, Braces } from 'lucide-react';
import styles from './project-compatibility.module.css';

export function ProjectCompatibility({ report }: { report: Report }) {
  const needsSetup = report.checks.some(check => check.state === 'setup');
  const capabilities = editingCapabilities(report);
  const icons = { text: Type, styles: SlidersHorizontal, responsive: Monitor, generated: Braces };
  return <details className={styles.panel}>
    <summary><span>Editing compatibility</span><span className={styles.status}>{!report.sourceMapping ? 'Source editing unavailable' : needsSetup ? 'Setup needed' : 'Review capabilities'}</span></summary>
    <p className={styles.note}>These checks read project metadata. Connecting the preview verifies the adapter; individual edits are checked before Save.</p>
    <section className={styles.capabilities} aria-label="Editing capabilities">
      {capabilities.items.map(item => { const Icon = icons[item.id]; return <div key={item.id} data-capability={item.id} data-state={item.state}>
        <Icon size={15} strokeWidth={1.6} aria-hidden="true"/>
        <div><strong>{item.label}</strong><p>{item.detail}</p></div>
        <span>{item.state === 'available' ? 'After connection' : item.state === 'setup' ? 'Setup needed' : item.state === 'unsupported' ? 'Unavailable' : 'Limited'}</span>
      </div>; })}
    </section>
    <p className={styles.nextStep} data-compatibility-next-step><strong>Next step</strong>{capabilities.nextStep}</p>
    <details className={styles.technical}><summary>Project details</summary><dl>{report.checks.map(check => <div key={check.id} data-state={check.state}>
      <dt><span className={styles.dot} aria-hidden="true"/>{check.label}<span className={styles.kind}>{check.state === 'available' ? 'Detected' : check.state === 'setup' ? 'Setup needed' : check.state === 'unsupported' ? 'Unavailable' : 'Limited'}</span></dt>
      <dd>{check.detail}</dd>
    </div>)}</dl></details>
  </details>;
}
