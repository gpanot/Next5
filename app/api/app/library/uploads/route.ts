import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { authedRoute } from '../../../../../src/server/api';
import { HttpError } from '../../../../../src/server/http';
import { putObject, presignObject } from '../../../../../src/server/storage/objectStore';
import { readForm } from '../../../../../src/server/storage/images';
import { isProductLine, requireWorkspace } from '../../../../../src/server/workspaces/workspaces';
import { prisma } from '../../../../../src/lib/db';
import { enforceRateLimit } from '../../../../../src/server/rateLimit';

export const maxDuration = 60;

const MAX_PHOTO_BYTES = 30 * 1024 * 1024; // 30 MB raw input
const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200 MB
const TARGET_PHOTO_KB = 600; // compress to ≤ 600 KB
const ACCEPTED_PHOTO = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const ACCEPTED_VIDEO = ['video/mp4', 'video/quicktime', 'video/mov', 'video/webm'];

/**
 * POST /api/app/library/uploads  — upload a photo or video to the brand media bank.
 * Multipart: file (image/* | video/*), product (string)
 * Returns: { id, url, kind }
 */
export const POST = authedRoute(async (req, session) => {
  await enforceRateLimit(`user-upload:${session.userId}`, 30, 3600);

  const p = new URL(req.url).searchParams;
  const product = p.get('product');
  const ws = await requireWorkspace(session.userId, isProductLine(product) ? product : undefined);

  const form = await readForm(req);
  const file = form.get('file');
  if (!(file instanceof File)) throw new HttpError(400, 'file_required', 'Upload a file.');

  const isPhoto = ACCEPTED_PHOTO.includes(file.type);
  const isVideo = ACCEPTED_VIDEO.includes(file.type);

  if (!isPhoto && !isVideo) {
    throw new HttpError(415, 'unsupported_type', 'Upload a JPG, PNG, WebP, HEIC photo or MP4/MOV/WebM video.');
  }

  let buffer: Buffer;
  let mimeType: string;
  let kind: 'photo' | 'video';

  if (isPhoto) {
    if (file.size > MAX_PHOTO_BYTES) throw new HttpError(413, 'file_too_large', 'Photo must be under 30 MB before compression.');
    // Compress to JPEG ≤ 600 KB, longest side ≤ 2048 px
    const raw = Buffer.from(await file.arrayBuffer());
    const image = sharp(raw, { failOn: 'error' });
    const meta = await image.metadata();
    if ((meta.width ?? 0) < 100 || (meta.height ?? 0) < 100) {
      throw new HttpError(422, 'too_small', 'Photo is too small (min 100 px).');
    }
    // Try progressively lower quality until we hit ≤ 600 KB
    let quality = 82;
    let compressed: Buffer;
    do {
      compressed = await image
        .clone()
        .rotate()
        .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();
      quality -= 6;
    } while (compressed.length > TARGET_PHOTO_KB * 1024 && quality > 20);
    buffer = compressed;
    mimeType = 'image/jpeg';
    kind = 'photo';
  } else {
    // Video — store as-is (no transcoding on the server)
    if (file.size > MAX_VIDEO_BYTES) throw new HttpError(413, 'file_too_large', 'Video must be under 200 MB.');
    buffer = Buffer.from(await file.arrayBuffer());
    mimeType = file.type;
    kind = 'video';
  }

  const ext = kind === 'video' ? (file.name.split('.').pop() ?? 'mp4') : 'jpg';
  const r2Key = `user-uploads/${ws.id}/${randomUUID()}.${ext}`;
  await putObject(r2Key, buffer, mimeType);

  const upload = await prisma.userUpload.create({
    data: {
      workspaceId: ws.id,
      r2Key,
      filename: file.name,
      mimeType,
      sizeBytes: buffer.length,
      kind,
    },
  });

  const url = await presignObject(r2Key);
  return NextResponse.json({ id: upload.id, url, kind, sizeBytes: upload.sizeBytes }, { status: 201 });
});

/**
 * GET /api/app/library/uploads?product=&kind=photo|video|&cursor=
 * Returns the user's uploaded media bank, newest first.
 */
export const GET = authedRoute(async (req, session) => {
  const p = new URL(req.url).searchParams;
  const product = p.get('product');
  const kind = p.get('kind'); // optional filter
  const cursor = p.get('cursor');
  const ws = await requireWorkspace(session.userId, isProductLine(product) ? product : undefined);

  const take = 40;
  const items = await prisma.userUpload.findMany({
    where: {
      workspaceId: ws.id,
      archivedAt: null,
      ...(kind === 'photo' || kind === 'video' ? { kind } : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const page = items.slice(0, take);
  const nextCursor = items.length > take ? (page[page.length - 1]?.id ?? null) : null;

  const dtos = await Promise.all(
    page.map(async (u) => ({
      id: u.id,
      url: await presignObject(u.r2Key),
      filename: u.filename,
      mimeType: u.mimeType,
      sizeBytes: u.sizeBytes,
      kind: u.kind,
      createdAt: u.createdAt.toISOString(),
    })),
  );

  return NextResponse.json({ items: dtos, nextCursor });
});
