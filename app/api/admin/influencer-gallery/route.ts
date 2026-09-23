import { NextResponse, type NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { adminRoute } from '../../../../src/server/admin/route';
import { prisma } from '../../../../src/lib/db';
import { putObject, presignObject, deleteObject } from '../../../../src/server/storage/objectStore';
import sharp from 'sharp';
import { normalizeUpload, readForm } from '../../../../src/server/storage/images';

/** Gallery faces are stored 9:16 (1080 × 1920), cropped around the face when the upload is another shape. */
const toStory = (buffer: Buffer): Promise<Buffer> =>
  sharp(buffer).resize({ width: 1080, height: 1920, fit: 'cover', position: sharp.strategy.attention }).jpeg({ quality: 90 }).toBuffer();

/** GET /api/admin/influencer-gallery — list all gallery items including archived. */
export const GET = adminRoute(async () => {
  const items = await prisma.influencerGalleryItem.findMany({
    orderBy: { createdAt: 'desc' },
  });
  const dtos = await Promise.all(
    items.map(async (item) => ({
      id: item.id,
      gender: item.gender,
      age: item.age,
      ethnicity: item.ethnicity,
      archived: item.archived,
      url: await presignObject(item.imageKey),
      createdAt: item.createdAt.toISOString(),
    })),
  );
  return NextResponse.json({ items: dtos });
});

/**
 * POST /api/admin/influencer-gallery — upload a curated gallery face.
 * Multipart: file (image), gender?, age?, ethnicity?. Stored as a 9:16 JPEG.
 */
export const POST = adminRoute(async (req: NextRequest) => {
  const form = await readForm(req);
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file_required' }, { status: 400 });
  }

  const buffer = await toStory(await normalizeUpload(file, 'gallery face'));
  const id = randomUUID().replace(/-/g, '').slice(0, 25);
  const imageKey = `influencer-gallery/${id}.jpg`;
  await putObject(imageKey, buffer, 'image/jpeg');

  const text = (name: string, max: number): string | null => form.get(name)?.toString().trim().slice(0, max) || null;
  const gender = text('gender', 20);
  const ageValue = Number(form.get('age'));
  const age = Number.isInteger(ageValue) && ageValue >= 18 && ageValue <= 90 ? ageValue : null;
  const ethnicity = text('ethnicity', 60);

  const item = await prisma.influencerGalleryItem.create({
    data: { imageKey, gender, age, ethnicity },
  });

  const url = await presignObject(item.imageKey);
  return NextResponse.json(
    { item: { id: item.id, gender, age, ethnicity, url, archived: false, createdAt: item.createdAt.toISOString() } },
    { status: 201 },
  );
});

/** PATCH /api/admin/influencer-gallery — archive/unarchive by id. Body: { id, archived } */
export const PATCH = adminRoute(async (req: NextRequest) => {
  const { id, archived } = (await req.json()) as { id?: string; archived?: boolean };
  if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });
  const item = await prisma.influencerGalleryItem.update({
    where: { id },
    data: { archived: archived ?? true },
  });
  return NextResponse.json({ item: { id: item.id, archived: item.archived } });
});

/** DELETE /api/admin/influencer-gallery — permanently delete a face. Body: { id } */
export const DELETE = adminRoute(async (req: NextRequest) => {
  const { id } = (await req.json()) as { id?: string };
  if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });
  const item = await prisma.influencerGalleryItem.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  await prisma.influencerGalleryItem.delete({ where: { id } });
  await deleteObject(item.imageKey).catch(() => undefined); // best-effort R2 cleanup
  return NextResponse.json({ ok: true });
});
