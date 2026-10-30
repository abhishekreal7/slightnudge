import { randomUUID } from 'node:crypto';
import { mkdir, readdir, writeFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { resolveRepositoryRoot } from '@/lib/slightnudge/repository-store';
import { validateMutatingRequest } from '@/lib/slightnudge/auth';

export const runtime = 'nodejs';

async function getAssetDirectory(request: Request) {
  const repositoryId = new URL(request.url).searchParams.get('repositoryId');
  const root = repositoryId ? await resolveRepositoryRoot(repositoryId) : process.cwd();
  for (const directory of [path.join(root, 'public'), path.join(root, 'public/slightnudge-assets')]) {
    try { const info = await lstat(directory); if (info.isSymbolicLink() || !info.isDirectory()) throw new Error('Image storage must be inside the project.'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  return path.join(root, 'public', 'slightnudge-assets');
}
const supportedTypes = new Map([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
]);
const maxBytes = 8 * 1024 * 1024;
const maxImageDimension = 10_000;
const maxImagePixels = 40_000_000;

function imageDimensions(type: string, bytes: Buffer): { width: number; height: number } | null {
  if (type === 'image/png' && bytes.length >= 24) return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  if (type === 'image/gif' && bytes.length >= 10) return { width: bytes.readUInt16LE(6), height: bytes.readUInt16LE(8) };
  if (type === 'image/webp' && bytes.length >= 30) {
    const chunk = bytes.toString('ascii', 12, 16);
    if (chunk === 'VP8X') return { width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3) };
    if (chunk === 'VP8L' && bytes[20] === 0x2f) {
      return { width: 1 + bytes[21] + ((bytes[22] & 0x3f) << 8), height: 1 + ((bytes[22] >> 6) | (bytes[23] << 2) | ((bytes[24] & 0x0f) << 10)) };
    }
    if (chunk === 'VP8 ' && bytes.length >= 30 && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
      return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
    }
  }
  if (type === 'image/jpeg' && bytes.length >= 4) {
    let offset = 2;
    while (offset + 4 < bytes.length) {
      if (bytes[offset] !== 0xff) { offset += 1; continue; }
      const marker = bytes[offset + 1];
      offset += 2;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        if (offset + 7 >= bytes.length) return null;
        return { height: bytes.readUInt16BE(offset + 3), width: bytes.readUInt16BE(offset + 5) };
      }
      if ([0xd8, 0xd9, 0x01, ...Array.from({ length: 8 }, (_, index) => 0xd0 + index)].includes(marker)) continue;
      const segmentLength = bytes.readUInt16BE(offset);
      if (segmentLength < 2) return null;
      offset += segmentLength;
    }
  }
  return null;
}

function sameOriginRequest(request: Request) {
  const origin = request.headers.get('origin');
  try { return Boolean(origin) && new URL(origin!).origin === new URL(request.url).origin; } catch { return false; }
}

export async function GET(request: Request) {
  try {
    const assetDirectory = await getAssetDirectory(request);
    const files = await readdir(assetDirectory);
    const assets = await Promise.all(files.filter((name) => /^[a-f0-9-]{36}\.(?:png|jpg|webp|gif)$/i.test(name)).map(async (name) => {
      const info = await lstat(path.join(assetDirectory, name));
      if (info.isSymbolicLink() || !info.isFile() || info.size > maxBytes) return null;
      return { id: name, url: `/slightnudge-assets/${name}`, size: info.size, addedAt: info.mtime.toISOString() };
    }));
    return NextResponse.json({ assets: assets.filter(Boolean) });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return NextResponse.json({ assets: [] });
    return NextResponse.json({ error: 'Could not load the image library.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = validateMutatingRequest(request);
  if (!auth.valid) return auth.response;
  try {
    const contentLength = Number(request.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > maxBytes + 64 * 1024) return NextResponse.json({ error: 'Images must be smaller than 8 MB.' }, { status: 413 });
    const assetDirectory = await getAssetDirectory(request);
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Choose an image to import.' }, { status: 400 });
    const extension = supportedTypes.get(file.type);
    if (!extension) return NextResponse.json({ error: 'Use a PNG, JPEG, WebP, or GIF image. SVG and executable formats are not accepted.' }, { status: 415 });
    if (!file.size || file.size > maxBytes) return NextResponse.json({ error: 'Images must be smaller than 8 MB.' }, { status: 413 });
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.byteLength !== file.size || bytes.byteLength > maxBytes) return NextResponse.json({ error: 'This image could not be validated.' }, { status: 400 });
    const signatures: Record<string, (value: Buffer) => boolean> = {
      'image/png': (value) => value.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
      'image/jpeg': (value) => value[0] === 0xff && value[1] === 0xd8 && value[value.length - 2] === 0xff && value[value.length - 1] === 0xd9,
      'image/webp': (value) => value.toString('ascii', 0, 4) === 'RIFF' && value.toString('ascii', 8, 12) === 'WEBP',
      'image/gif': (value) => value.toString('ascii', 0, 6) === 'GIF87a' || value.toString('ascii', 0, 6) === 'GIF89a',
    };
    if (!signatures[file.type](bytes)) return NextResponse.json({ error: 'The image contents do not match its file type.' }, { status: 415 });
    const dimensions = imageDimensions(file.type, bytes);
    if (!dimensions || !dimensions.width || !dimensions.height || dimensions.width > maxImageDimension || dimensions.height > maxImageDimension || dimensions.width * dimensions.height > maxImagePixels) {
      return NextResponse.json({ error: 'This image could not be decoded safely. Maximum dimensions are 10,000 × 10,000 pixels.' }, { status: 415 });
    }
    await mkdir(assetDirectory, { recursive: true });
    const id = `${randomUUID()}.${extension}`;
    await writeFile(path.join(assetDirectory, id), bytes, { flag: 'wx', mode: 0o644 });
    return NextResponse.json({ asset: { id, url: `/slightnudge-assets/${id}`, size: bytes.byteLength, addedAt: new Date().toISOString() } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Could not import this image.' }, { status: 400 });
  }
}
