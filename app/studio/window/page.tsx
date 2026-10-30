import { redirect } from 'next/navigation';
import { editorHref, type EditorQuery } from '@/lib/slightnudge/editor-route';
export default async function Page({searchParams}:{searchParams:Promise<EditorQuery>}) { redirect(editorHref(undefined,await searchParams)); }
