import { NextResponse } from 'next/server';
import { prisma } from '../../../../../src/lib/db';
import { authedRoute } from '../../../../../src/server/api';
import { presignObject } from '../../../../../src/server/storage/objectStore';

/** GET /api/app/influencers/gallery — list curated gallery faces (for the gallery picker). */
export const GET = authedRoute(async () => {
  const items = await prisma.influencerGalleryItem.findMany({
    where: { archived: false },
    orderBy: { createdAt: 'asc' },
  });

  const dtos = await Promise.all(
    items.map(async (item) => ({
      id: item.id,
      gender: item.gender,
      age: item.age,
      ethnicity: item.ethnicity,
      url: await presignObject(item.imageKey),
    })),
  );

  return NextResponse.json({ items: dtos });
});
