import { adminRoute, json } from '../../../../../src/server/admin/route';
import { toCharacterDto } from '../../../../../src/server/admin/ugcStore';
import { prisma } from '../../../../../src/lib/db';

/** GET ?kind=ai|photo — saved characters, newest first, with fresh image links. */
export const GET = adminRoute(async (req) => {
  const kind = req.nextUrl.searchParams.get('kind');
  const characters = await prisma.ugcCharacter.findMany({
    where: { archived: false, ...(kind === 'ai' || kind === 'photo' || kind === 'avatar' ? { kind } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 60,
  });
  return json({ characters: await Promise.all(characters.map(toCharacterDto)) });
});
