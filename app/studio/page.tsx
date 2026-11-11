import { EditorClient as EditorWorkspace } from '@/components/slightnudge/EditorClient';
import { redirect } from 'next/navigation';
import { editorHref, legacyStudioEnabled, type EditorQuery } from '@/lib/slightnudge/editor-route';

export default async function StudioPage({searchParams}:{searchParams:Promise<EditorQuery>}) {
  const query=await searchParams;
  if(legacyStudioEnabled(query))return <EditorWorkspace mode="studio" />;
  redirect(editorHref(undefined, { mode: 'studio', ...query }));
}
