import { redirect } from 'next/navigation';
import { editorHref, type EditorQuery } from '@/lib/slightnudge/editor-route';
export default async function Page({params,searchParams}:{params:Promise<{repoId:string}>;searchParams:Promise<EditorQuery>}) { redirect(editorHref((await params).repoId,await searchParams)); }
