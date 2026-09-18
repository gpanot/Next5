import { NextResponse, type NextRequest } from 'next/server';
import type { UgcScene, UgcShot } from '../../../../../src/config/ugcLab';
import { adminRoute } from '../../../../../src/server/admin/route';
import { chatJson } from '../../../../../src/server/ai/openai';
import { browserUrl } from '../../../../../src/server/admin/ugcStore';
import { prisma } from '../../../../../src/lib/db';

const SHOTS: readonly UgcShot[] = ['close', 'medium', 'wide'];

const SYSTEM_PROMPT =
  'You describe a photo so a video model can continue it as a talking video. Return JSON only: ' +
  '{ "person": "...", "setting": "...", "action": "...", "shot": "close" | "medium" | "wide" }. ' +
  'person: one short sentence — approximate age, look, hair, exact clothing and colors. ' +
  'setting: where they are, as a place phrase that fits after "in" — e.g. "the sunny backyard of a single-story white house with tall trees". Include time of day and light. ' +
  'action: what they are doing in the photo, e.g. "walking toward the camera, smiling". ' +
  'shot: close = head and shoulders, medium = waist up, wide = most of the body is visible. ' +
  'Plain words, no judgments about attractiveness, no guesses about identity.';

const isScene = (value: unknown): value is UgcScene => {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.person === 'string' && typeof v.setting === 'string' && typeof v.action === 'string' &&
    typeof v.shot === 'string' && (SHOTS as readonly string[]).includes(v.shot)
  );
};

/** POST { characterId } → { scene } — person, place, action and framing of an uploaded photo, saved on the character. */
export const POST = adminRoute(async (req: NextRequest) => {
  const { characterId } = (await req.json()) as { characterId?: string };
  const character = characterId ? await prisma.ugcCharacter.findUnique({ where: { id: characterId } }) : null;
  if (!character) {
    return NextResponse.json({ error: 'characterId is required' }, { status: 400 });
  }

  const result = await chatJson<unknown>(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: await browserUrl(character.imageKey), detail: 'low' } },
          { type: 'text', text: 'Describe this photo for the video prompt.' },
        ],
      },
    ],
    { maxTokens: 250, temperature: 0.2, timeoutMs: 20_000 },
  );

  if (!isScene(result)) {
    return NextResponse.json({ error: 'Could not describe the photo' }, { status: 502 });
  }
  await prisma.ugcCharacter.update({ where: { id: character.id }, data: { scene: result } });
  return NextResponse.json({ scene: result });
});
