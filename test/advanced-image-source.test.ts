import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { updateAdvancedImage } from '../lib/slightnudge/image-source-advanced';
import { Project, SyntaxKind } from 'ts-morph';
import { isNextImage } from '../lib/slightnudge/image-identity';
import { updateStaticTailwindClass } from '../lib/slightnudge/ast-nudger';
import { createRequire } from 'node:module';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sn-advanced-images-'));
try {
  fs.mkdirSync(path.join(root, 'public/slightnudge-assets'), { recursive: true });
  const red = await sharp({ create: { width: 200, height: 100, channels: 3, background: 'red' } }).png().toBuffer();
  const blue = await sharp({ create: { width: 160, height: 80, channels: 3, background: 'blue' } }).png().toBuffer();
  fs.writeFileSync(path.join(root, 'public/original.png'), red);
  const asset = '/slightnudge-assets/11111111-1111-1111-1111-111111111111.png'; fs.writeFileSync(path.join(root, 'public', asset), blue);
  const filePath = path.join(root, 'page.tsx');
  const change = (sourceText: string, property: 'src' | 'alt' = 'src', value = asset) => updateAdvancedImage({ root, filePath, sourceText, line: 1, column: sourceText.indexOf('<Photo') >= 0 ? sourceText.indexOf('<Photo') + 1 : sourceText.indexOf('<img') + 1, property, value });
  const source = 'import Photo from "next/image";import Original from "./public/original.png";export default function Page(){return <><Photo src={Original} alt="Original"/><Photo src="/other.png" width={20} height={10} alt="Other"/></>}';
  const changed = await change(source);
  assert.ok(changed.after.includes('width={200} height={100}')); assert.ok(changed.after.includes('<Photo src="/other.png"'));
  assert.ok(changed.after.includes('import Original from "./public/original.png"')); assert.deepEqual(fs.readFileSync(path.join(root, 'public/original.png')), red);
  fs.writeFileSync(path.join(root, 'tsconfig.json'), JSON.stringify({ compilerOptions: { baseUrl: '.', paths: { '@/*': ['./*'] } } }));
  const aliased = await change(source.replace('./public/original.png', '@/public/original.png')); assert.ok(aliased.after.includes('width={200} height={100}'));
  const filled = await change(source.replace('src={Original}', 'src={Original} fill sizes="100vw"'));
  assert.ok(filled.after.includes('fill sizes="100vw"')); assert.ok(!filled.after.includes('width={200}'));
  const unfilled = await change(source.replace('src={Original}', 'src={Original} fill={false}'));
  assert.ok(unfilled.after.includes('width={200} height={100}'));
  const styled = source.replace('src={Original}', 'src={Original} className="object-cover"');
  const framing = updateStaticTailwindClass({ filePath, sourceText: styled, line: 1, column: styled.indexOf('<Photo') + 1, property: 'objectFit', value: 'object-contain', dryRun: true });
  assert.equal(framing.success, true); assert.ok(framing.updatedSource?.includes('object-contain')); assert.ok(framing.updatedSource?.includes('src={Original}'));
  const described = await change(source, 'alt', 'A "clear" & useful image'); assert.ok(described.after.includes('A \\"clear\\"') || described.after.includes('clear')); assert.ok(described.after.includes('src={Original}'));
  const picture = '<picture><source media="(min-width: 700px)" type="image/avif" srcSet="/large.avif 200w, /larger.avif 400w" sizes="200px"/><source type="image/webp" srcSet="/small.webp 1x, /retina.webp 2x"/><img src="/original.png" width={200} height={100} alt="Original"/></picture>';
  const responsive = await change(picture); assert.ok(responsive.after.includes('media="(min-width: 700px)"')); assert.ok(responsive.after.includes('sizes="200px"'));
  assert.match(responsive.after, /\.avif 200w, .*\.avif 400w/); assert.match(responsive.after, /\.webp 1x, .*\.webp 2x/);
  const variants = fs.readdirSync(path.join(root, 'public/slightnudge-assets')).filter(name => name.endsWith('.avif') || name.endsWith('.webp'));
  assert.equal(variants.length, 4);
  for (const name of variants) { const meta = await sharp(fs.readFileSync(path.join(root, 'public/slightnudge-assets', name))).metadata(); assert.ok([200, 400].includes(meta.width!)); assert.equal(meta.height, meta.width! / 2); assert.equal(meta.format, name.endsWith('.avif') ? 'heif' : 'webp'); }
  for (const unsafe of [
    'import Photo from "next/image";export default function Page(){return <Photo src={props.image} alt="A"/>}',
    'import Photo from "next/image";export default function Page(){return <Photo src="/a.png" loader={loader} alt="A"/>}',
    'import Photo from "next/image";export default function Page(){return <Photo src="/a.png" placeholder="blur" alt="A"/>}',
    '<picture><source srcSet={props.sources}/><img src="/a.png"/></picture>',
    '<picture>{sources}<img src="/a.png"/></picture>',
    '<picture><source type="image/svg+xml" srcSet="/a.svg 1x"/><img src="/a.png"/></picture>',
    '<img src="/a.png" srcSet="/a.png 200w, /b.png 2x"/>',
  ]) { const count = fs.readdirSync(path.join(root, 'public/slightnudge-assets')).length; await assert.rejects(() => change(unsafe)); assert.equal(fs.readdirSync(path.join(root, 'public/slightnudge-assets')).length, count); }
  const oriented = '/slightnudge-assets/33333333-3333-3333-3333-333333333333.jpg';
  fs.writeFileSync(path.join(root, 'public', oriented), await sharp({ create: { width: 1000, height: 100, channels: 3, background: 'blue' } }).jpeg().withMetadata({ orientation: 6 }).toBuffer());
  const variantCount = fs.readdirSync(path.join(root, 'public/slightnudge-assets')).length;
  await assert.rejects(() => change('<img src="/a.png" srcSet="/a.png 10000w"/>', 'src', oriented), /size limit/);
  assert.equal(fs.readdirSync(path.join(root, 'public/slightnudge-assets')).length, variantCount);
  const project = new Project({ useInMemoryFileSystem: true }); const shadowed = project.createSourceFile('/test.tsx', 'import Photo from "next/image";function Wrapper(Photo:any){return <Photo src="/a.png"/>}');
  assert.equal(isNextImage(shadowed.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)[0]), false);
  const loader = createRequire(import.meta.url)('../lib/slightnudge/next-source-loader.cjs');
  const instrument = (text: string) => loader.call({ getOptions: () => ({ development: true, root }), resourcePath: filePath }, text) as string;
  assert.equal((instrument(source).match(/data-source-image="next"/g) || []).length, 2);
  assert.equal((instrument(shadowed.getFullText()).match(/data-source-image="next"/g) || []).length, 0);
  const shadowedAsset = 'import Photo from "next/image";import Original from "./public/original.png";function Wrapper(Original:any){return <Photo src={Original}/>}';
  assert.equal(instrument(shadowedAsset).includes('data-source-image-src={Original.src}'), false);
  console.log('PASS advanced image source: aliased next/image static import dimensions and fill, untouched shared assets/usages, native responsive formats/descriptors/dimensions, dynamic/custom/shared/format refusals without variant writes, shadowed bindings');
} finally { assert.ok(root.startsWith(os.tmpdir()) && path.basename(root).startsWith('sn-advanced-images-')); fs.rmSync(root, { recursive: true, force: true }); }
