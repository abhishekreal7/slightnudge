import { notFound } from 'next/navigation';
import { EditorClient as EditorWorkspace } from '@/components/slightnudge/EditorClient';
import { editorView, type EditorQuery } from '@/lib/slightnudge/editor-route';

export default async function EditorPage({ params, searchParams }: {
  params: Promise<{ project?: string[] }>; searchParams: Promise<EditorQuery>;
}) {
  const { project } = await params, query = await searchParams;
  if (project && project.length !== 1) notFound();
  return <EditorWorkspace mode="window" unified view={editorView(query.view)} projectId={project?.[0]} initialPanel={query.panel === 'inspector' ? 'inspector' : query.panel === 'layers' ? 'layers' : null}/>;
}
