import { notFound } from 'next/navigation';
import { LocalSourcePreview } from '@/components/slightnudge/LocalSourcePreview';

/** Render the same project components as their real routes, without nesting a
 * second editor shell. No project JSX, copy, classes, or layout is reconstructed. */
export default async function SourcePreview({ params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params;
  if (!/^fixture-[1-5]$/.test(pageId)) notFound();
  return <LocalSourcePreview pageId={pageId} />;
}
