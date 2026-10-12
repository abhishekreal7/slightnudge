import { NextResponse } from 'next/server';
import { lstat } from 'node:fs/promises';
import path from 'node:path';
import { nudgeElement, reorderElement, updateStaticImageSource, updateStaticJsxText, updateStaticTailwindClass, type EditableStyleProperty } from '@/lib/slightnudge/ast-nudger';
import { createPendingSourceEdit, discardPendingSourceEdit } from '@/lib/slightnudge/edit-history';
import { resolveRepositoryRoot, resolveRepositorySourcePath, resolveWorkspaceSourcePath } from '@/lib/slightnudge/repository-store';

const allowedProperties = new Set<EditableStyleProperty>(['fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'letterSpacing', 'textTransform', 'textColor', 'alignment', 'backgroundColor', 'padding', 'display', 'width', 'maxWidth', 'gap', 'borderRadius', 'justifyContent', 'alignItems', 'flexDirection']);
const allowedDirections = new Set(['right', 'left', 'up', 'down']);

function sameOriginRequest(request: Request) {
  const origin = request.headers.get('origin');
  try { return Boolean(origin) && new URL(origin!).origin === new URL(request.url).origin; } catch { return false; }
}

export async function POST(request: Request) {
  try {
    if (!sameOriginRequest(request)) return NextResponse.json({ error: 'Edit previews must come from this SlightNudge workspace.' }, { status: 403 });
    const body = await request.json();
    if (typeof body.kind !== 'string') {
      return NextResponse.json({ error: 'A source file and edit type are required.' }, { status: 400 });
    }
    const repositoryId = typeof body.repositoryId === 'string' ? body.repositoryId : undefined;
    const sourcePath = typeof body.sourcePath === 'string' ? body.sourcePath : undefined;
    if (repositoryId && !sourcePath) return NextResponse.json({ error: 'Choose a source file from the imported repository.' }, { status: 400 });
    if (!repositoryId && typeof body.filePath !== 'string') return NextResponse.json({ error: 'A source file is required.' }, { status: 400 });
    const filePath = repositoryId ? (await resolveRepositorySourcePath(repositoryId, sourcePath!)).filePath : resolveWorkspaceSourcePath(body.filePath);
    const target = {
      filePath,
      line: body.line ? Number(body.line) : undefined,
      column: body.column ? Number(body.column) : undefined,
      elementId: typeof body.elementId === 'string' ? body.elementId : undefined,
      tagName: typeof body.tagName === 'string' ? body.tagName : undefined,
      className: typeof body.className === 'string' ? body.className : undefined,
      dryRun: true,
    };

    if (body.kind === 'reorder') {
      const validDirections = new Set(['earlier', 'later', 'top', 'bottom']);
      if (body.direction && !validDirections.has(body.direction) && body.targetIndex === undefined) {
        return NextResponse.json({ error: 'Choose a valid direction: top, bottom, earlier, or later.' }, { status: 400 });
      }
      const result = reorderElement({
        ...target,
        direction: body.direction,
        targetIndex: typeof body.targetIndex === 'number' ? body.targetIndex : undefined,
        tagName: target.tagName,
        className: target.className,
      });
      if (!result.success || !result.updatedSource || !result.originalSource) {
        return NextResponse.json({ error: result.reason || 'This element cannot be reordered safely.' }, { status: 422 });
      }
      const preview = createPendingSourceEdit({
        filePath,
        before: result.originalSource,
        after: result.updatedSource,
        summary: body.targetIndex !== undefined ? `reorder element to slot ${body.targetIndex}` : `reorder element ${body.direction || 'swap'}`,
        oldValue: '',
        newValue: '',
        line: result.line,
        previewType: 'reorder',
        repositoryId,
        sourcePath,
      });
      return NextResponse.json(preview.changed ? { ...preview, success: true, targetIndex: body.targetIndex } : { success: true, changed: false, message: 'Element position is already unchanged.' });
    }

    if (body.kind === 'nudge') {
      if (!allowedDirections.has(body.direction)) return NextResponse.json({ error: 'Choose a valid direction.' }, { status: 400 });
      const result = nudgeElement({ ...target, direction: body.direction, stepSize: body.stepSize === 'big' ? 'big' : 'normal', breakpoint: typeof body.breakpoint === 'string' ? body.breakpoint : '' });
      if (!result.success || !result.updatedSource || !result.originalSource) return NextResponse.json({ error: result.reason || 'This change cannot be previewed safely.' }, { status: 422 });
      const summary = result.oldClass && result.newClass ? `${result.oldClass} → ${result.newClass}` : (result.newClass ? `none → ${result.newClass}` : `move ${body.direction}`);
      const preview = createPendingSourceEdit({ filePath, before: result.originalSource, after: result.updatedSource, summary, oldValue: result.oldClass || result.oldClassNameValue || '', newValue: result.newClass || result.newClassNameValue || '', line: result.line, repositoryId, sourcePath });
      return NextResponse.json(preview.changed ? { ...preview, success: true } : { success: true, changed: false, message: 'That spacing value is already applied.' });
    }

    if (body.kind === 'style') {
      if (typeof body.property !== 'string' || !allowedProperties.has(body.property)) return NextResponse.json({ error: 'That style property is not supported.' }, { status: 400 });
      if (typeof body.value !== 'string') return NextResponse.json({ error: 'Choose a valid style value.' }, { status: 400 });
      if (body.breakpoint !== undefined && !['', 'sm', 'md', 'lg', 'xl', '2xl'].includes(body.breakpoint)) return NextResponse.json({ error: 'Choose a supported responsive breakpoint.' }, { status: 400 });
      const result = updateStaticTailwindClass({ ...target, property: body.property as EditableStyleProperty, value: body.value, breakpoint: typeof body.breakpoint === 'string' ? body.breakpoint : '' });
      if (!result.success || !result.updatedSource || !result.originalSource) return NextResponse.json({ error: 'This change cannot be previewed safely.' }, { status: 422 });
      const summary = `${result.oldToken || 'none'} → ${result.newToken}`;
      const preview = createPendingSourceEdit({ filePath, before: result.originalSource, after: result.updatedSource, summary, oldValue: result.oldToken || result.oldClassName, newValue: result.newToken || result.newClassName, line: result.line, repositoryId, sourcePath });
      return NextResponse.json(preview.changed ? { ...preview, success: true } : { success: true, changed: false, message: 'That style is already applied.' });
    }

    if (body.kind === 'text') {
      if (typeof body.value !== 'string') return NextResponse.json({ error: 'Enter the text you want to preview.' }, { status: 400 });
      const result = updateStaticJsxText({ ...target, value: body.value });
      if (!result.success || !result.updatedSource || !result.originalSource) return NextResponse.json({ error: result.reason || 'This text cannot be edited safely.' }, { status: 422 });
      const oldSnippet = result.oldValue.length > 18 ? `${result.oldValue.slice(0, 16)}…` : result.oldValue;
      const newSnippet = result.newValue.length > 18 ? `${result.newValue.slice(0, 16)}…` : result.newValue;
      const summary = `"${oldSnippet}" → "${newSnippet}"`;
      const preview = createPendingSourceEdit({ filePath, before: result.originalSource, after: result.updatedSource, summary, oldValue: result.oldValue, newValue: result.newValue, line: result.line, previewType: 'textContent', repositoryId, sourcePath });
      return NextResponse.json(preview.changed ? { ...preview, success: true } : { success: true, changed: false, message: 'That text is already applied.' });
    }

    if (body.kind === 'image-source') {
      if (typeof body.value !== 'string') return NextResponse.json({ error: 'Choose an image from the imported library.' }, { status: 400 });
      const root = repositoryId ? await resolveRepositoryRoot(repositoryId) : process.cwd();
      const imageName = body.value.split('/').at(-1) || '';
      const assetDirectory = path.join(root, 'public', 'slightnudge-assets');
      const assetPath = path.join(assetDirectory, imageName);
      const directoryInfo = await lstat(assetDirectory);
      const assetInfo = await lstat(assetPath);
      if (directoryInfo.isSymbolicLink() || !directoryInfo.isDirectory() || assetInfo.isSymbolicLink() || !assetInfo.isFile()) {
        return NextResponse.json({ error: 'That imported image is no longer available.' }, { status: 404 });
      }
      const result = updateStaticImageSource({ ...target, value: body.value });
      if (!result.success || !result.updatedSource || !result.originalSource) return NextResponse.json({ error: result.reason || 'This image cannot be replaced safely.' }, { status: 422 });
      const preview = createPendingSourceEdit({ filePath, before: result.originalSource, after: result.updatedSource, summary: 'replace image', oldValue: result.oldValue, newValue: result.newValue, line: result.line, previewType: 'imageSource', repositoryId, sourcePath });
      return NextResponse.json(preview.changed ? { ...preview, success: true } : { success: true, changed: false, message: 'That image is already applied.' });
    }

    return NextResponse.json({ error: 'Choose a supported edit type.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not prepare this preview.' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!sameOriginRequest(request)) return NextResponse.json({ error: 'Edit previews must come from this SlightNudge workspace.' }, { status: 403 });
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'A preview id is required.' }, { status: 400 });
    discardPendingSourceEdit(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not discard this preview.' }, { status: 400 });
  }
}
