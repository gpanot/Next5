// server-only — never import from a 'use client' file.
//
// AI image fallback for story shots. When the library has no clip in the audience's industry
// that matches the shot well enough, the engine writes an image prompt, generates a 9:16 image,
// and saves it as a normal library asset: categories on the descriptor and the tags, a
// description, slot scores for its role, and an embedding. The next deck for the same
// industry finds it by search — the library grows where it was thin.

import { randomUUID } from 'node:crypto';
import { prisma } from '../../../lib/db';
import { uploadToR2 } from '../../../lib/r2';
import { chatJson } from '../../ai/openai';
import { generateVerticalImage } from '../../ai/imageGeneration';
import { blitzKeys } from '../../admin/blitzStore';
import { embedDescriptorRows } from '../../labs/assetDescriptor/embedding';
import { categoryLabel } from './categories';
import type { LibraryAsset } from './library';

export type ImageNeed = {
  /** Stable key back to the shot, e.g. "electricians:pain". */
  key: string;
  role: 'pain' | 'oldWay' | 'mechanism' | 'proof' | 'inaction';
  text: string;
};

type ImagePlan = { key: string; prompt: string; description: string };

/** Slot scores for a generated image, by the role it was made for. */
const SLOTS: Record<ImageNeed['role'], { hook: number; problem: number; proof: number; payoff: number; cta: number }> = {
  pain:      { hook: 0.3, problem: 0.85, proof: 0.1, payoff: 0.1, cta: 0.1 },
  oldWay:    { hook: 0.2, problem: 0.8, proof: 0.1, payoff: 0.15, cta: 0.1 },
  mechanism: { hook: 0.2, problem: 0.1, proof: 0.4, payoff: 0.85, cta: 0.3 },
  proof:     { hook: 0.2, problem: 0.1, proof: 0.85, payoff: 0.6, cta: 0.3 },
  inaction:  { hook: 0.2, problem: 0.75, proof: 0.1, payoff: 0.1, cta: 0.1 },
};

const PROMPT_WRITER = `You write image prompts for 9:16 vertical backgrounds of a short social video.
Each image sits behind one line of on-screen text and must SHOW that line's moment for the audience.

Rules for every prompt:
- Realistic candid phone photo, natural light, real workplace of the audience. Not glossy stock.
- One clear subject and action. Show the audience's world (tools, place, clothes) so it is obvious who it is for.
- People: ordinary adults, not celebrities, faces fine but not the focus.
- No text, letters, logos, screens with readable words, or watermarks.
- Keep the top third calm and uncluttered: captions go there.
- Max 60 words.

Also write "description": one plain sentence of what the image shows (for search).
Return JSON only, one item per input line, "key" copied exactly (s0, s1…):
{ "items": [ { "key": "s0", "prompt": "...", "description": "..." } ] }`;

/** One LLM call writes the prompts for every shot that needs an image. */
async function planImages(audience: string, categories: string[], needs: ImageNeed[]): Promise<ImagePlan[]> {
  // Short ids ("s0") survive the round trip; free-text keys came back reworded.
  const result = await chatJson<{ items?: Array<{ key?: string; prompt?: string; description?: string }> }>(
    [
      { role: 'system', content: PROMPT_WRITER },
      {
        role: 'user',
        content: `Audience: ${audience} (industries: ${categories.map(categoryLabel).join(', ') || 'general'})\n`
          + needs.map((n, i) => `s${i} | ${n.role} shot | on-screen line: "${n.text}"`).join('\n'),
      },
    ],
    { maxTokens: 1_500, temperature: 0.5 },
  );
  return (result?.items ?? []).flatMap((p) => {
    const need = needs[Number(p.key?.replace(/^s/, ''))];
    return need && p.prompt ? [{ key: need.key, prompt: p.prompt, description: p.description || need.text }] : [];
  });
}

/** Generates, stores and describes one image. Returns it as a library asset. */
async function createAsset(plan: ImagePlan, need: ImageNeed, categories: string[], workspaceId: string | null): Promise<LibraryAsset> {
  const image = await generateVerticalImage(plan.prompt);
  const id = randomUUID().replace(/-/g, '');
  const r2Key = blitzKeys.asset(id, image.ext);
  await uploadToR2(r2Key, image.buffer, image.contentType);

  const tags = [...categories.map(categoryLabel), 'AI'];
  await prisma.blitzAsset.create({
    data: { id, type: 'BACKGROUND', r2Key, name: `${plan.description.slice(0, 90)} [AI]`, tags, source: 'library', workspaceId },
  });
  const slots = SLOTS[need.role];
  const descriptor = {
    subject: plan.description,
    meaning: `Shows: ${need.text}`,
    bestUse: `${need.role} shot for ${categories.map(categoryLabel).join(', ')} videos`,
    categories,
    aiPrompt: plan.prompt,
    textSafeZone: 'top_third',
  };
  const row = await prisma.assetDescriptor.create({
    data: {
      id: `desc-${id.slice(0, 12)}`,
      blitzAssetId: id,
      workspaceId,
      kind: 'background',
      source: 'ai_generated',
      status: 'done',
      model: 'nano-banana-2-lite',
      descriptor,
      retrievalText: `${plan.description} AI image for ${need.role} shots.`,
      rightsRisk: 'none',
      identifiablePerson: false,
      publicFigureLikely: false,
      textSafeZone: 'top_third',
      energyLevel: 0.5,
      categories,
      slotHook: slots.hook,
      slotProblem: slots.problem,
      slotProof: slots.proof,
      slotPayoff: slots.payoff,
      slotCta: slots.cta,
      nicheRealtor: categories.includes('real_estate') ? 0.9 : 0.3,
      nicheTiktokShop: categories.includes('retail_shopping') ? 0.9 : 0.3,
    },
  });
  await embedDescriptorRows([{ id: row.id, kind: 'background', retrieval_text: row.retrievalText, descriptor }]);

  return {
    assetId: id, kind: 'background', r2Key, name: plan.description,
    trimStart: 0, trimEnd: 0, textSafeZone: 'top_third', retrievalText: plan.description,
    score: 1, similarity: 1, categories,
  };
}

/**
 * Generates images for the shots the library could not cover. Runs in parallel; a failed image
 * leaves that shot on its best library match. Returns key → asset.
 */
export async function generateShotImages(
  audience: string,
  categories: string[],
  needs: ImageNeed[],
  workspaceId: string | null,
): Promise<Map<string, LibraryAsset>> {
  const out = new Map<string, LibraryAsset>();
  if (needs.length === 0) return out;
  const plans = await planImages(audience, categories, needs);
  const results = await Promise.allSettled(plans.map((p) => createAsset(p, needs.find((n) => n.key === p.key)!, categories, workspaceId)));
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') out.set(plans[i]!.key, r.value);
    else console.error(`[generatedAssets] image for ${plans[i]!.key} failed:`, r.reason);
  });
  console.log(`[generatedAssets] ${audience}: generated ${out.size}/${needs.length} image(s)`);
  return out;
}
