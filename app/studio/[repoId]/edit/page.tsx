import { EditorClient as EditorWorkspace } from '@/components/slightnudge/EditorClient';
import { redirect } from 'next/navigation';
import { editorHref, legacyStudioEnabled, type EditorQuery } from '@/lib/slightnudge/editor-route';
export default async function Page({params,searchParams}:{params:Promise<{repoId:string}>;searchParams:Promise<EditorQuery>}) {
  const {repoId}=await params,query=await searchParams;
  if(legacyStudioEnabled(query))return <EditorWorkspace mode="studio" />;
  redirect(editorHref(repoId,query));
}
