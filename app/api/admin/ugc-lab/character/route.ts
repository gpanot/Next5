import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../src/server/admin/route';
import { tregCall, tregPollTask, PORTRAIT_PROMPT_BASE } from '../../../../../src/server/admin/ugcLab';
import { mirrorFile, toCharacterDto, ugcKeys, uniqueStamp, vendorUrl } from '../../../../../src/server/admin/ugcStore';
import { prisma } from '../../../../../src/lib/db';

export const maxDuration = 300;

type ReapiTask = { id?: string; status?: string } | null;

/** Generates a portrait with Gemini 3 Pro via Treg and returns the provider's temporary image URL. */
async function generateGemini(referenceKey?: string): Promise<string> {
  const payload: Record<string, unknown> = {
    model: 'gemini-3-pro-image-preview',
    prompt: PORTRAIT_PROMPT_BASE,
    size: '9:16',
    resolution: '1K',
  };
  if (referenceKey) payload.image_urls = [await vendorUrl(referenceKey)];

  const task = await tregCall<ReapiTask>('reapi.image-gen.gemini-3-pro-image', { method: 'POST', body: payload, timeoutMs: 60_000 });
  if (!task?.id) throw new Error('Gemini 3 Pro task returned no ID');

  const result = await tregPollTask(task.id);
  if (result.status === 'failed') throw new Error('Gemini 3 Pro task failed');
  const url = result.output?.image_urls?.[0];
  if (!url) throw new Error('Gemini 3 Pro returned no image URL');
  return url;
}

/** POST { referenceKey? } → { character } — a new AI portrait, saved to R2 and the database. */
export const POST = adminRoute(async (req: NextRequest) => {
  const { referenceKey } = (await req.json()) as { referenceKey?: string };
  if (referenceKey && !referenceKey.startsWith('ugc-lab/references/')) {
    return NextResponse.json({ error: 'Unknown reference image' }, { status: 400 });
  }

  let providerUrl: string;
  try {
    providerUrl = await generateGemini(referenceKey);
  } catch (err) {
    console.error('[ugc-lab/character] Gemini 3 Pro failed:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Character generation failed' }, { status: 502 });
  }

  const imageKey = ugcKeys.character(uniqueStamp());
  await mirrorFile(providerUrl, imageKey, 'image/jpeg');
  const character = await prisma.ugcCharacter.create({ data: { kind: 'ai', imageKey, model: 'gemini-3-pro' } });
  return NextResponse.json({ character: await toCharacterDto(character) });
});
