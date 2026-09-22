import { NextResponse, type NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { adminRoute } from '../../../../src/server/admin/route';
import { prisma } from '../../../../src/lib/db';
import { putObject, presignObject } from '../../../../src/server/storage/objectStore';
import { normalizeUpload, readForm } from '../../../../src/server/storage/images';

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
 * Multipart: file (image), gender?, age?, ethnicity?
 */
export const POST = adminRoute(async (req: NextRequest) => {
  const form = await readForm(req);
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file_required' }, { status: 400 });
  }

  const buffer = await normalizeUpload(file, 'gallery face');
  const id = randomUUID().replace(/-/g, '').slice(0, 25);
  const imageKey = `influencer-gallery/${id}.jpg`;
  await putObject(imageKey, buffer, 'image/jpeg');

  const gender = form.get('gender')?.toString() ?? null;
  const age = form.get('age') ? Number(form.get('age')) : null;
  const ethnicity = form.get('ethnicity')?.toString() ?? null;

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
