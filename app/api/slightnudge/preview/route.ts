import { inspectActionSource, updateActionSource } from '@/lib/slightnudge/link-source';
import { inspectComponentProps, updateComponentProp } from '@/lib/slightnudge/component-props';
import { inspectCrossFileComponent, updateCrossFileComponent, crossFilePropValue } from '@/lib/slightnudge/component-ownership';
import { inspectInstanceComponent, instanceDraftValues, updateInstanceComponent } from '@/lib/slightnudge/instance-ownership';
import { readDraftSource } from '@/lib/slightnudge/edit-history';
import { inspectIconSource, updateIconSource, replaceLucideSource } from '@/lib/slightnudge/icon-source';
import { openIconLibrary, replacementIcons } from '@/lib/slightnudge/icon-library';
import { updateAdvancedImage } from '@/lib/slightnudge/image-source-advanced';
import { readFileSync } from 'node:fs';
import { NextResponse } from 'next/server';
import { lstat } from 'node:fs/promises';
import path from 'node:path';
import { nudgeElement, reorderElement, updateStaticImageSource, updateStaticJsxText, updateStaticTailwindClass, type EditableStyleProperty } from '@/lib/slightnudge/ast-nudger';
import { createPendingSourceEdit, discardPendingSourceEdit } from '@/lib/slightnudge/edit-history';
import { resolveRepositoryRoot, resolveRepositorySourcePath, resolveWorkspaceSourcePath } from '@/lib/slightnudge/repository-store';
import { corsHeaders, handleCorsPreflight } from '@/lib/slightnudge/cors';
import { validateMutatingRequest } from '@/lib/slightnudge/auth';
import { validTranslation } from '@/lib/slightnudge/translation';
import { moveIntoContainer } from '@/lib/slightnudge/container-move';
import { prepareDraftTarget } from '@/lib/slightnudge/source-draft';
import { findProjectRoot, verifyTailwindClass, getProjectResponsiveScopes } from '@/lib/slightnudge/tailwind-verifier';

const allowedProperties = new Set<EditableStyleProperty>([
  'backgroundImage', 'boxShadow', 'minWidth', 'minHeight', 'flexGrow', 'flexShrink', 'alignSelf', 'fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'letterSpacing', 'textTransform',
  'textColor', 'alignment', 'backgroundColor', 'padding', 'display', 'width', 'maxWidth',
  'gap', 'borderRadius', 'justifyContent', 'alignItems', 'flexDirection',
  'borderWidth', 'borderColor', 'fontStyle', 'textDecoration',
  'gridTemplateColumns', 'flexWrap', 'objectFit', 'objectPosition',
  'transitionProperty', 'transitionDuration', 'transitionDelay', 'transitionTimingFunction'
]);
const allowedDirections = new Set(['right', 'left', 'up', 'down']);

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request) || new NextResponse(null, { status: 204 });
}

export async function POST(request: Request) {
  const auth = validateMutatingRequest(request);
  if (!auth.valid) return auth.response;

  try {
    const body = await request.json();
    if (typeof body.kind !== 'string') {
      return NextResponse.json({ error: 'A source file and edit type are required.' }, { status: 400, headers: corsHeaders(request) });
    }
    const repositoryId = typeof body.repositoryId === 'string' ? body.repositoryId : undefined;
    const sourcePath = typeof body.sourcePath === 'string' ? body.sourcePath : undefined;
    if (repositoryId && !sourcePath) return NextResponse.json({ error: 'Choose a source file from the imported repository.' }, { status: 400 });
    if (!repositoryId && typeof body.filePath !== 'string') return NextResponse.json({ error: 'A source file is required.' }, { status: 400 });
    const filePath = repositoryId ? (await resolveRepositorySourcePath(repositoryId, sourcePath!)).filePath : resolveWorkspaceSourcePath(body.filePath);
    let target: Parameters<typeof prepareDraftTarget>[0] & { dryRun: boolean } = {
      filePath,
      line: body.line ? Number(body.line) : undefined,
      column: body.column ? Number(body.column) : undefined,
      elementId: typeof body.elementId === 'string' ? body.elementId : undefined,
      tagName: typeof body.tagName === 'string' ? body.tagName : undefined,
      className: typeof body.className === 'string' ? body.className : undefined,
      dryRun: true,
    };
    const drafting = body.draft === true;
    if(body.instance && body.kind!=='component')throw Error('Use This instance props for this component. Shared definition styles affect every use.');
    if (drafting && (!['component', 'style', 'text', 'image', 'action', 'icon', 'move', 'nudge', 'reorder', 'reparent'].includes(body.kind) || repositoryId && !['component', 'style', 'text', 'image', 'action', 'icon', 'move', 'reorder', 'reparent'].includes(body.kind))) return NextResponse.json({ error: 'This operation is not available in continuous drafts yet.' }, { status: 422 });
    const scope = { repositoryId, root: repositoryId ? await resolveRepositoryRoot(repositoryId) : process.cwd(), component: body.kind === 'component', image: body.kind === 'image', action: body.kind === 'action', icon: body.kind === 'icon', structural: ['reorder', 'reparent'].includes(body.kind), text: body.kind === 'text' };
    const parentId = typeof body.parentPreviewId === 'string' ? body.parentPreviewId : undefined;
    const draft = drafting ? prepareDraftTarget(target, parentId, scope) : undefined;
    if (draft) target = draft.target;
    const createPreview = draft ? draft.create : createPendingSourceEdit;

    if (body.kind === 'reparent') {
      if (!draft) return NextResponse.json({ error: 'Open the editing window to move elements between containers.' }, { status: 422 });
      const destination = body.destination;
      if (!destination || destination.path !== (sourcePath || body.filePath) || !Number.isInteger(destination.line) || !Number.isInteger(destination.column) || destination.line < 1 || destination.column < 1) return NextResponse.json({ error: 'Choose a destination in the same source file.' }, { status: 422 });
      const destinationPlan = prepareDraftTarget({ filePath, line: destination.line, column: destination.column, tagName: destination.tagName, elementId: destination.elementId }, parentId, scope);
      const result = moveIntoContainer({ ...draft.target, sourceText: draft.target.sourceText!, destination: destinationPlan.target, targetIndex: body.targetIndex });
      const preview = await draft.create({ filePath, before: result.before, after: result.after, summary: 'Move into container', oldValue: '', newValue: '', previewType: 'reorder', repositoryId, sourcePath }, false, result.sourceOrder);
      return NextResponse.json({ ...preview, success: true });
    }

    if (body.kind === 'reorder') {
      const validDirections = new Set(['earlier', 'later', 'top', 'bottom']);
      if (body.targetIndex !== undefined) {
        if (typeof body.targetIndex !== 'number' || !Number.isInteger(body.targetIndex) || body.targetIndex < 0 || body.targetIndex > 10000) {
          return NextResponse.json({ error: 'targetIndex must be a valid non-negative integer.' }, { status: 400 });
        }
      } else if (!body.direction || !validDirections.has(body.direction)) {
        return NextResponse.json({ error: 'Choose a valid direction: top, bottom, earlier, or later.' }, { status: 400 });
      }
      const result = reorderElement({
        ...target,
        direction: body.direction,
        targetIndex: body.targetIndex,
        tagName: target.tagName,
        className: target.className,
      });
      if (!result.success || !result.updatedSource || !result.originalSource) {
        return NextResponse.json({ error: result.reason || 'This element cannot be reordered safely.' }, { status: 422 });
      }
      const reorderPreview = {
        filePath,
        before: result.originalSource,
        after: result.updatedSource,
        summary: body.targetIndex !== undefined ? `reorder element to slot ${body.targetIndex}` : `reorder element ${body.direction || 'swap'}`,
        oldValue: '',
        newValue: '',
        line: result.line,
        previewType: 'reorder' as const,
        repositoryId,
        sourcePath,
      };
      const preview = draft ? await draft.create(reorderPreview, false, result.sourceOrder) : createPendingSourceEdit(reorderPreview);
      return NextResponse.json(preview.changed ? { ...preview, success: true, targetIndex: body.targetIndex } : { success: true, changed: false, message: 'Element position is already unchanged.' });
    }

    if (body.kind === 'nudge' || body.kind === 'move') {
      const moving = body.kind === 'move';
      if (moving && (!validTranslation({ x: body.x, y: body.y }) || Boolean(body.breakpoint))) return NextResponse.json({ error: 'Choose a supported position and the Default scope.' }, { status: 400 });
      if (!moving && !allowedDirections.has(body.direction)) return NextResponse.json({ error: 'Choose a valid direction.' }, { status: 400 });
      const result = nudgeElement({ ...target, direction: moving ? 'right' : body.direction, translation: moving ? { x: body.x, y: body.y } : undefined, stepSize: body.stepSize === 'big' ? 'big' : 'normal', breakpoint: typeof body.breakpoint === 'string' ? body.breakpoint : '' });
      if (!result.success || !result.updatedSource || !result.originalSource) return NextResponse.json({ error: result.reason || 'This change cannot be previewed safely.' }, { status: 422 });
      const summary = moving ? `Move to X ${body.x}px, Y ${body.y}px` : result.oldClass && result.newClass ? `${result.oldClass} → ${result.newClass}` : (result.newClass ? `none → ${result.newClass}` : `move ${body.direction}`);
      const preview = await createPreview({
        filePath,
        before: result.originalSource,
        after: result.updatedSource,
        summary,
        oldValue: result.oldClass || result.oldClassNameValue || '',
        newValue: result.newClass || result.newClassNameValue || '',
        line: result.line,
        column: target.column,
        elementId: target.elementId,
        tagName: target.tagName,
        oldClassName: result.oldClassNameValue,
        newClassName: result.newClassNameValue,
        removedTokens: (result.oldClass || '').split(/\s+/).filter(Boolean).filter(token => !(result.newClass || '').split(/\s+/).includes(token)),
        addedTokens: (result.newClass || '').split(/\s+/).filter(Boolean).filter(token => !(result.oldClass || '').split(/\s+/).includes(token)),
        previewType: 'className',
        repositoryId,
        sourcePath,
      });
      return NextResponse.json(preview.changed ? { ...preview, success: true } : { success: true, changed: false, message: 'That spacing value is already applied.' });
    }

    if (body.kind === 'component') {
      if (!draft) return NextResponse.json({ error: 'Open the shared editor to edit component properties.' }, { status: 422 });
      const source = { sourceText: target.sourceText || readFileSync(filePath, 'utf8'), line: target.line!, column: target.column! };
      if (body.operation === 'inspect') {
        if(body.instance){
          try{
            const info=inspectInstanceComponent({root:scope.root,filePath:sourcePath||body.filePath,line:body.line,column:body.column,instance:body.instance});
            const id=body.drafts?.[info.owner.filePath];
            if(typeof id==='string'){
              const callerPath=repositoryId?(await resolveRepositorySourcePath(repositoryId,info.owner.filePath)).filePath:resolveWorkspaceSourcePath(info.owner.filePath);
              const pending=readDraftSource(id,callerPath,repositoryId);
              if(pending.sourceOrder?.some((value,index)=>value!==index))throw Error('Save structural changes before editing instance props.');
              info.fields=instanceDraftValues(scope.root,info.dependency,pending.after);
            }
            const {dependency,...publicInfo}=info;return NextResponse.json({success:true,component:publicInfo});
          }catch(error){return NextResponse.json({success:true,component:{component:'Shared component',fields:[],ownership:'unsupported',reason:error instanceof Error?error.message:'Cannot prove this instance owner.'}});}
        }
        const info=inspectComponentProps(source);
        if(!info.reason.includes('exported')) return NextResponse.json({success:true,component:info});
        try {
          const definitionPath=repositoryId?sourcePath!:body.filePath;
          if(parentId)throw new Error('Save or undo changes to this component definition before editing its caller.');
          const cross=inspectCrossFileComponent({root:scope.root,filePath:definitionPath,line:target.line!,column:target.column!});
          const ids=body.drafts;
          if(ids&&typeof ids==='object'&&!Array.isArray(ids)&&Object.keys(ids).length<=16&&typeof ids[cross.owner.filePath]==='string'){
            const callerPath=repositoryId?(await resolveRepositorySourcePath(repositoryId,cross.owner.filePath)).filePath:resolveWorkspaceSourcePath(cross.owner.filePath);
            const pending=readDraftSource(ids[cross.owner.filePath],callerPath,repositoryId);
            if(pending.sourceOrder?.some((value,index)=>value!==index))throw new Error('Save structural changes to the caller before editing this prop.');
            const prepared=prepareDraftTarget({...cross.owner,filePath:callerPath},pending.id,{...scope,structural:true});
            cross.fields[0].value=crossFilePropValue(prepared.target.sourceText!,{...cross.owner,line:prepared.target.line!,column:prepared.target.column!},cross.fields[0].name);
          }
          return NextResponse.json({success:true,component:{component:cross.component,fields:cross.fields,reason:cross.reason,ownership:cross.ownership,owner:cross.owner}});
        }catch(error){return NextResponse.json({success:true,component:{...info,reason:error instanceof Error?error.message:info.reason}});}
      }
      if (typeof body.property !== 'string' || typeof body.value !== 'string' || body.breakpoint !== undefined && body.breakpoint !== '') return NextResponse.json({ error: 'Edit component props in All sizes and Default state.' }, { status: 422 });
      if(body.definition){
        const definition=body.definition;
        if(typeof definition.filePath!=='string'||!Number.isSafeInteger(definition.line)||!Number.isSafeInteger(definition.column))throw new Error('Choose an exact component definition.');
        const validated=repositoryId?(await resolveRepositorySourcePath(repositoryId,definition.filePath)).filePath:resolveWorkspaceSourcePath(definition.filePath);
        if(definition.instance){
          const info=inspectInstanceComponent({root:scope.root,filePath:definition.filePath,line:definition.line,column:definition.column,instance:definition.instance});
          if(path.resolve(scope.root,info.owner.filePath)!==filePath||body.line!==info.owner.line||body.column!==info.owner.column||body.tagName!==info.owner.tagName)throw Error('The instance write owner changed. Select it again.');
          if(parentId&&readDraftSource(parentId,filePath,repositoryId).sourceOrder?.some((value,index)=>value!==index))throw Error('Save structural changes before editing instance props.');
          if(path.resolve(validated)!==path.resolve(scope.root,info.dependency.definition))throw Error('The definition is outside its project.');
          const baseline=parentId?readDraftSource(parentId,filePath,repositoryId).before:readFileSync(filePath,'utf8');
          const result=updateInstanceComponent(scope.root,info.dependency,source.sourceText,baseline,body.property,body.value);
          return NextResponse.json({...await createPreview({filePath,...result,componentDependencies:[info.dependency],summary:`Change ${body.property} · this instance`,previewType:'reorder',repositoryId,sourcePath}),ownerPath:info.owner.filePath,success:true});
        }
        const cross=inspectCrossFileComponent({root:scope.root,filePath:definition.filePath,line:definition.line,column:definition.column});
        if(path.resolve(scope.root,cross.owner.filePath)!==filePath||body.line!==cross.owner.line||body.column!==cross.owner.column||body.tagName!==cross.owner.tagName||body.property!==cross.fields[0].name)throw new Error('The component write owner changed. Select it again.');
        if(parentId&&readDraftSource(parentId,filePath,repositoryId).sourceOrder?.some((value,index)=>value!==index))throw new Error('Save structural changes to the caller before editing this prop.');
        if(path.resolve(validated)!==path.resolve(scope.root,cross.dependency.definition))throw new Error('The component definition is outside its project.');
        const result=updateCrossFileComponent(source.sourceText,{...cross.owner,line:target.line!,column:target.column!},body.property,body.value);
        return NextResponse.json({...await createPreview({filePath,...result,componentDependencies:[cross.dependency],summary:`Change ${body.property} prop`,previewType:'reorder',repositoryId,sourcePath}),ownerPath:cross.owner.filePath,success:true});
      }
      const result = updateComponentProp({ ...source, property: body.property, value: body.value });
      return NextResponse.json({ ...await createPreview({ filePath, ...result, summary: `Change ${body.property} prop`, previewType: 'reorder', repositoryId, sourcePath }), success: true });
    }

    if (body.kind === 'icon') {
      if (!draft) return NextResponse.json({ error: 'Open the shared editor to edit icons.' }, { status: 422 });
      const source = { sourceText: target.sourceText || readFileSync(filePath, 'utf8'), line: target.line!, column: target.column! };
      if (body.operation === 'inspect') {
        const icon = inspectIconSource(source);
        let choices: ReturnType<ReturnType<typeof openIconLibrary>['choices']> = [];
        if (icon.replacement.editable) try { const library = openIconLibrary(scope.root); library.shape(icon.replacement.name); choices = library.choices(); } catch { icon.replacement.editable = false; icon.replacement.reason = 'This project’s Lucide version has no supported static shape catalogue.'; }
        return NextResponse.json({ success: true, icon: { ...icon, choices } });
      }
      if (!['size', 'strokeWidth', 'color', 'icon'].includes(body.property) || typeof body.value !== 'string' || body.breakpoint !== undefined && body.breakpoint !== '') return NextResponse.json({ error: 'Edit icon properties in All sizes and Default state.' }, { status: 422 });
      if (body.property === 'icon') {
        if (!(replacementIcons as readonly string[]).includes(body.value)) throw new Error('Choose an icon from this project’s supported catalogue.');
        const library = openIconLibrary(scope.root); library.shape(body.value); library.shape(inspectIconSource(source).replacement.name);
      }
      const result = body.property === 'icon' ? replaceLucideSource({ ...source, name: body.value }) : updateIconSource({ ...source, property: body.property, value: body.value });
      return NextResponse.json({ ...await createPreview({ filePath, ...result, summary: `Change icon ${body.property}`, previewType: 'reorder', repositoryId, sourcePath }), success: true });
    }

    if (body.kind === 'action') {
      if (!draft) return NextResponse.json({ error: 'Open the shared editor to edit component properties.' }, { status: 422 });
      const source = { sourceText: target.sourceText || readFileSync(filePath, 'utf8'), line: target.line!, column: target.column! };
      if (body.operation === 'inspect') return NextResponse.json({ success: true, action: inspectActionSource(source) });
      if (!['href', 'target', 'type', 'disabled'].includes(body.property) || typeof body.value !== 'string' || body.breakpoint !== undefined && body.breakpoint !== '') return NextResponse.json({ error: 'Edit component behavior in All sizes and Default state.' }, { status: 422 });
      const result = updateActionSource({ ...source, property: body.property, value: body.value });
      const preview = await createPreview({ filePath, ...result, summary: body.property === 'href' ? 'Change link destination' : body.property === 'target' ? 'Change link opening behavior' : body.property === 'type' ? 'Change button type' : 'Change button availability', previewType: 'reorder', repositoryId, sourcePath });
      return NextResponse.json({ ...preview, success: true });
    }

    if (body.kind === 'image') {
      if (!draft || !['src', 'alt'].includes(body.property) || typeof body.value !== 'string' || body.breakpoint !== undefined && body.breakpoint !== '') return NextResponse.json({ error: 'Edit image content in All sizes and Default state.' }, { status: 422 });
      if (body.property === 'src') {
        if (!/^\/slightnudge-assets\/[a-f0-9-]{36}\.(?:png|jpe?g|webp|gif)$/i.test(body.value)) throw new Error('Choose an imported image.');
        const root = scope.root;
        for (const directory of [path.join(root, 'public'), path.join(root, 'public/slightnudge-assets')]) if ((await lstat(directory)).isSymbolicLink()) throw new Error('Use an image stored inside this project.');
        const info = await lstat(path.join(root, 'public', body.value));
        if (!info.isFile() || info.isSymbolicLink()) throw new Error('The imported image is unavailable.');
      }
      const result = await updateAdvancedImage({ root: scope.root, filePath, sourceText: target.sourceText || readFileSync(filePath, 'utf8'), line: target.line!, column: target.column!, property: body.property, value: body.value });
      const preview = await createPreview({ filePath, ...result, summary: body.property === 'src' ? 'Replace image' : 'Edit image description', previewType: 'reorder', repositoryId, sourcePath });
      return NextResponse.json({ ...preview, success: true });
    }

    if (body.kind === 'style') {
      if (typeof body.property !== 'string' || !allowedProperties.has(body.property)) return NextResponse.json({ error: 'That style property is not supported.' }, { status: 400 });
      if (typeof body.value !== 'string') return NextResponse.json({ error: 'Choose a valid style value.' }, { status: 400 });
      const breakpoint = typeof body.breakpoint === 'string' ? body.breakpoint : '';
      const interaction = ['', 'hover', 'focus', 'focus-visible', 'active'].includes(breakpoint);
      const responsiveScopes = interaction ? undefined : await getProjectResponsiveScopes(findProjectRoot(filePath));
      const responsiveScope = responsiveScopes?.find(scope => scope.name === breakpoint);
      if (body.breakpoint !== undefined && typeof body.breakpoint !== 'string' || !interaction && !responsiveScope) return NextResponse.json({ error: 'Choose a breakpoint supported by this project.', responsiveScopes }, { status: 400 });
      const result = updateStaticTailwindClass({ ...target, property: body.property as EditableStyleProperty, value: body.value, breakpoint, verifiedResponsiveScope: Boolean(responsiveScope), important: body.important === true });
      if (!result.success || !result.updatedSource || !result.originalSource) return NextResponse.json({ error: result.reason || 'This change cannot be previewed safely.' }, { status: 422 });
      const labels:Record<string,string>={backgroundImage:'gradient',boxShadow:'shadow',minWidth:'minimum width',minHeight:'minimum height',flexGrow:'flex growth',flexShrink:'flex shrinking',alignSelf:'self alignment'};
      const summary = labels[body.property] ? `${['bg-none','shadow-none'].includes(body.value)?'Remove':'Change'} ${labels[body.property]}${breakpoint?` · ${breakpoint}`:''}` : `${result.oldToken || 'none'} → ${result.newToken}`;
      const candidate = result.newToken;
      const compiled = await verifyTailwindClass(candidate, findProjectRoot(filePath));
      if (!compiled.verified) return NextResponse.json({ error: compiled.error || 'The project cannot render this utility.' }, { status: 422 });
      const css = compiled.layer ? `@layer ${compiled.layer} {\n${compiled.css || ''}\n}` : compiled.css || '';
      const preview = await createPreview({
        filePath,
        before: result.originalSource,
        after: result.updatedSource,
        summary,
        oldValue: result.oldToken || result.oldClassName,
        newValue: result.newToken || result.newClassName,
        line: result.line,
        column: target.column,
        elementId: target.elementId,
        tagName: target.tagName,
        oldClassName: result.oldClassName,
        newClassName: result.newClassName,
        removedTokens: result.oldToken ? result.oldToken.split(/\s+/) : [],
        addedTokens: result.newToken ? [result.newToken] : [],
        previewType: 'className',
        repositoryId,
        sourcePath,
      });
      return NextResponse.json(preview.changed ? { ...preview, css, responsiveMedia: responsiveScope?.media, responsiveScopes, oldClassName: result.oldClassName, newClassName: result.newClassName, success: true } : { success: true, changed: false, responsiveScopes, message: 'That style is already applied.' });
    }

    if (body.kind === 'text') {
      if (typeof body.value !== 'string') return NextResponse.json({ error: 'Enter the text you want to preview.' }, { status: 400 });
      const result = updateStaticJsxText({ ...target, value: body.value });
      if (!result.success || !result.updatedSource || !result.originalSource) return NextResponse.json({ error: result.reason || 'This text cannot be edited safely.' }, { status: 422 });
      const oldSnippet = result.oldValue.length > 18 ? `${result.oldValue.slice(0, 16)}…` : result.oldValue;
      const newSnippet = result.newValue.length > 18 ? `${result.newValue.slice(0, 16)}…` : result.newValue;
      const summary = `"${oldSnippet}" → "${newSnippet}"`;
      const preview = await createPreview({
        filePath,
        before: result.originalSource,
        after: result.updatedSource,
        summary,
        oldValue: result.oldValue,
        newValue: result.newValue,
        line: result.line,
        column: target.column,
        elementId: target.elementId,
        tagName: target.tagName,
        previewType: 'textContent',
        repositoryId,
        sourcePath,
      });
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
      const preview = await createPreview({
        filePath,
        before: result.originalSource,
        after: result.updatedSource,
        summary: 'replace image',
        oldValue: result.oldValue,
        newValue: result.newValue,
        line: result.line,
        column: target.column,
        elementId: target.elementId,
        tagName: target.tagName,
        previewType: 'imageSource',
        repositoryId,
        sourcePath,
      });
      return NextResponse.json(preview.changed ? { ...preview, success: true } : { success: true, changed: false, message: 'That image is already applied.' }, { headers: corsHeaders(request) });
    }

    return NextResponse.json({ error: 'Choose a supported edit type.' }, { status: 400, headers: corsHeaders(request) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not prepare this preview.' }, { status: 400, headers: corsHeaders(request) });
  }
}

export async function DELETE(request: Request) {
  const auth = validateMutatingRequest(request);
  if (!auth.valid) return auth.response;

  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'A preview id is required.' }, { status: 400, headers: corsHeaders(request) });
    discardPendingSourceEdit(id);
    return NextResponse.json({ success: true }, { headers: corsHeaders(request) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not discard this preview.' }, { status: 400, headers: corsHeaders(request) });
  }
}

