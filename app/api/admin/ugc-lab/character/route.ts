import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../src/server/admin/route';
import {
  tregCall,
  tregPollTask,
  deepinfraImageGen,
  PORTRAIT_PROMPT_BASE,
  PORTRAIT_NEGATIVE,
  type CharacterCandidate,
} from '../../../../../src/server/admin/ugcLab';

type ReapiTask = { id?: string; status?: string };

/** Generate Candidate A: Gemini 3 Pro via treg (reapi) — async, poll to completion. */
async function generateGeminiCandidate(referenceImageUrl?: string): Promise<string> {
  const payload: Record<string, unknown> = {
    model: 'gemini-3-pro-image-preview',
    prompt: PORTRAIT_PROMPT_BASE,
    size: '9:16',
    resolution: '1K',
  };

  if (referenceImageUrl) {
    payload.image_urls = [referenceImageUrl];
  }

  const task = await tregCall<ReapiTask>(
    'reapi.image-gen.gemini-3-pro-image',
    { method: 'POST', body: payload, timeoutMs: 60_000 },
  );

  if (!task.id) throw new Error('Gemini 3 Pro task returned no ID');

  const result = await tregPollTask(task.id);
  if (result.status === 'failed') throw new Error('Gemini 3 Pro task failed');

  const url = result.output?.image_urls?.[0];
  if (!url) throw new Error('Gemini 3 Pro returned no image URL');
  return url;
}

/** Generate Candidate B: FLUX 1 Dev via DeepInfra — synchronous response. */
async function generateFluxCandidate(): Promise<string> {
  // Combine portrait prompt with negative prompt guidance as a negative-style instruction
  const fullPrompt =
    PORTRAIT_PROMPT_BASE +
    '\n\nAvoid: ' +
    PORTRAIT_NEGATIVE.split(', ').slice(0, 10).join(', ');
  return deepinfraImageGen(fullPrompt);
}

// ── Route ─────────────────────────────────────────────────────────────────────

export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json()) as { referenceImageUrl?: string };
  const { referenceImageUrl } = body;

  // Run both candidates in parallel; capture individual failures gracefully
  const [geminiResult, fluxResult] = await Promise.allSettled([
    generateGeminiCandidate(referenceImageUrl),
    generateFluxCandidate(),
  ]);

  const candidates: CharacterCandidate[] = [];

  if (geminiResult.status === 'fulfilled') {
    candidates.push({ url: geminiResult.value, model: 'gemini-3-pro' });
  } else {
    console.error('[ugc-lab/character] Gemini 3 Pro failed:', geminiResult.reason);
  }

  if (fluxResult.status === 'fulfilled') {
    candidates.push({ url: fluxResult.value, model: 'flux-1-dev' });
  } else {
    console.error('[ugc-lab/character] FLUX failed:', fluxResult.reason);
  }

  if (candidates.length === 0) {
    return NextResponse.json(
      { error: 'Both character generation models failed. Check server logs.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ candidates });
});
