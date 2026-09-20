import { NextResponse, type NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { adminRoute } from '../../../../../src/server/admin/route';
import { chatJson } from '../../../../../src/server/ai/openai';
import { browserUrl, toCharacterDto } from '../../../../../src/server/admin/ugcStore';
import { prisma } from '../../../../../src/lib/db';

export const maxDuration = 60;

/**
 * Portrait Clone system prompt.
 * Instructs gpt-4o to analyse the photo and return a JSON that pins every visual attribute
 * so Seedance 2.5 can reproduce the look exactly — no AI slop, no randomised features.
 */
const SYSTEM_PROMPT = `You are a portrait-clone analyst. Examine the uploaded photo and return a single JSON object that pins every visible visual attribute of the person so a video generation model can reproduce their exact look.

Return ONLY valid JSON with no markdown wrapper. Include these top-level keys:
- subject: { apparent_age, gender, height_impression, build, posture }
- face: { shape, skin_tone_hex, undertone, eye_shape, eye_color_hex, eyebrow_shape, nose_description, lip_color_hex, lip_description, makeup_notes }
- hair: { color_hex, length, texture, style, part_side }
- outfit: { top_description, bottom_description, colors }
- critical_constraints: [array of short imperative strings, one per distinctive feature that AI models tend to drift on — e.g. "EYES: monolid, narrow, slight downward tilt", "SKIN: warm tan #C4956A, visible pores on nose"]
- negative_prompt: [array of model-default traits to suppress — e.g. "big round double-eyelid eyes", "V-line jaw", "poreless skin"]

Rules:
- Use hex codes for every color.
- Geometric specifics beat adjectives: "slightly downturned outer corners" beats "sad eyes".
- Flag every trait that differs from a generic AI beauty standard in critical_constraints.
- Plain English. No names, no identity guesses.`;

/** POST { characterId } → { portraitJson } — portrait-clone analysis stored on the character. */
export const POST = adminRoute(async (req: NextRequest) => {
  const { characterId } = (await req.json()) as { characterId?: string };
  const character = characterId
    ? await prisma.ugcCharacter.findUnique({ where: { id: characterId } })
    : null;

  if (!character) {
    return NextResponse.json({ error: 'characterId is required' }, { status: 400 });
  }
  if (character.kind !== 'avatar') {
    return NextResponse.json({ error: 'Portrait clone is only available for avatar characters' }, { status: 400 });
  }

  const imageUrl = await browserUrl(character.imageKey);

  const portraitJson = await chatJson<Record<string, unknown>>(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
          { type: 'text', text: 'Analyse this photo and return the portrait JSON.' },
        ],
      },
    ],
    { model: 'gpt-4o', maxTokens: 1200, temperature: 0.2, timeoutMs: 45_000 },
  );

  if (!portraitJson || typeof portraitJson !== 'object') {
    return NextResponse.json({ error: 'Portrait analysis failed — try again' }, { status: 502 });
  }

  await prisma.ugcCharacter.update({
    where: { id: character.id },
    data: { portraitJson: portraitJson as Prisma.InputJsonObject },
  });
  const updated = await prisma.ugcCharacter.findUniqueOrThrow({ where: { id: character.id } });
  return NextResponse.json({ character: await toCharacterDto(updated), portraitJson });
});
