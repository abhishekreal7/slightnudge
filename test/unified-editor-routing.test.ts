import assert from 'node:assert/strict';
import { editorHref, editorView, legacyStudioEnabled } from '../lib/slightnudge/editor-route';
assert.equal(editorHref(undefined), '/editor');
const href=editorHref('project-name',{preview:'http://localhost:3001/a?x=1&y=2',tag:['one','two'],empty:'',view:'fit'});
const url=new URL(href,'http://localhost');
assert.equal(url.pathname,'/editor/project-name');assert.deepEqual(url.searchParams.getAll('tag'),['one','two']);assert.equal(url.searchParams.get('empty'),'');assert.equal(url.searchParams.get('preview'),'http://localhost:3001/a?x=1&y=2');
assert.equal(editorView(undefined),'full');assert.equal(editorView('fit'),'fit');assert.equal(editorView(['fit','full']),'fit');assert.equal(editorView('unknown'),'full');
const previous=process.env.SLIGHTNUDGE_LEGACY_STUDIO;
try{delete process.env.SLIGHTNUDGE_LEGACY_STUDIO;assert.equal(legacyStudioEnabled({legacyStudio:'1'}),false);process.env.SLIGHTNUDGE_LEGACY_STUDIO='1';assert.equal(legacyStudioEnabled({}),false);assert.equal(legacyStudioEnabled({legacyStudio:'1'}),true);}finally{if(previous===undefined)delete process.env.SLIGHTNUDGE_LEGACY_STUDIO;else process.env.SLIGHTNUDGE_LEGACY_STUDIO=previous;}
console.log('PASS canonical route: default/full/fit, project paths, repeated/empty/encoded query values, legacy flag off by default and explicit opt-in');
