import { NextResponse, type NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { adminRoute } from '../../../../../src/server/admin/route';
import { getObject, putObject, presignObject } from '../../../../../src/server/storage/objectStore';
import { prisma } from '../../../../../src/lib/db';

/**
 * POST /api/admin/gallery-faces/promote
 * Body: { generatedKey, gender?, age?, ethnicity? }
 *
 * Copies the draft image from gallery-drafts/gen/ to influencer-gallery/ and
 * creates an InfluencerGalleryItem record — making it visible in the Library Face tab.
 */
export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json()) as {
    generatedKey?: string;
    gender?: string;
    age?: string | number;
    ethnicity?: string;
  };

  const { generatedKey } = body;
  if (!generatedKey || !generatedKey.startsWith('gallery-drafts/gen/')) {
    return NextResponse.json({ error: 'generatedKey is required and must be a gallery-drafts/gen/ key' }, { status: 400 });
  }

  // Read draft from R2
  const buffer = await getObject(generatedKey);
  if (!buffer) {
    return NextResponse.json({ error: 'Draft image not found in storage. It may have been deleted.' }, { status: 404 });
  }

  // Write to library location
  const id = randomUUID().replace(/-/g, '').slice(0, 25);
  const imageKey = `influencer-gallery/${id}.jpg`;
  await putObject(imageKey, buffer, 'image/jpeg');

  // Parse fields
  const gender = body.gender?.trim() || null;
  const ageRaw = Number(body.age);
  const age = Number.isInteger(ageRaw) && ageRaw >= 18 && ageRaw <= 90 ? ageRaw : null;
  const ethnicity = body.ethnicity?.trim().slice(0, 60) || null;

  const item = await prisma.influencerGalleryItem.create({
    data: { imageKey, gender, age, ethnicity },
  });

  const url = await presignObject(imageKey);
  return NextResponse.json({
    item: {
      id: item.id,
      imageKey: item.imageKey,
      gender: item.gender,
      age: item.age,
      ethnicity: item.ethnicity,
      archived: item.archived,
      url,
      createdAt: item.createdAt.toISOString(),
    },
  }, { status: 201 });
});
