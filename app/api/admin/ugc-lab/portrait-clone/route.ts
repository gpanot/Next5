import { NextResponse, type NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { adminRoute } from '../../../../../src/server/admin/route';
import { generatePortraitJson } from '../../../../../src/server/admin/portraitClone';
import { browserUrl, toCharacterDto } from '../../../../../src/server/admin/ugcStore';
import { prisma } from '../../../../../src/lib/db';

export const maxDuration = 120;

/**
 * POST { characterId } → { character, portraitJson }.
 * Runs the Portrait Clone analysis on any character (photo, AI or avatar) and stores the locked JSON on it.
 * Calling it again replaces the stored JSON with a fresh one.
 */
export const POST = adminRoute(async (req: NextRequest) => {
  const { characterId } = (await req.json()) as { characterId?: string };
  const character = characterId
    ? await prisma.ugcCharacter.findUnique({ where: { id: characterId } })
    : null;
  if (!character) {
    return NextResponse.json({ error: 'characterId is required' }, { status: 400 });
  }

  const imageUrl = await browserUrl(character.imageKey);
  const portraitJson = await generatePortraitJson(imageUrl, `${character.kind}_${character.id.slice(-6)}`);
  if (!portraitJson) {
    return NextResponse.json({ error: 'JSON generation failed. Try again.' }, { status: 502 });
  }

  const updated = await prisma.ugcCharacter.update({
    where: { id: character.id },
    data: { portraitJson: portraitJson as Prisma.InputJsonObject },
  });
  return NextResponse.json({ character: await toCharacterDto(updated), portraitJson });
});
