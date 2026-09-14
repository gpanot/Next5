// server-only — never import from a 'use client' file.

import type { BatchItem } from '@prisma/client';
import { prisma } from '../../lib/db';
import { chatJson, isOpenAiEnabled } from '../ai/openai';
import { imageDataUrl } from '../ai/imageInput';
import { SCORE_CRITERIA, totalScore, type ScoreCriterion, type ScoreDetails } from '../../lib/scoreRubric';

const BEST_FOR = ['feed', 'story', 'listing', 'profile', 'ad'] as const;

type RawScore = { criteria?: Partial<Record<ScoreCriterion, number>>; tip?: string; best_for?: string };

const systemPrompt = (product: 'brand' | 'shop') => `You review photos for small business social media (${product === 'shop' ? 'online clothing and accessory shops on TikTok Shop, Shopee and Instagram' : 'service professionals like realtors, coaches and beauty pros on Instagram, Facebook and LinkedIn'}).
Rate the photo 0-10 on each check. Be strict: 9-10 is rare, 5 is average.
- stop: would a thumb stop scrolling? Contrast, color, a clear focal point, emotion or energy.
- subject: ${product === 'shop' ? 'the product is easy to see, well framed, fully shown where it matters' : 'the person is easy to see, face and eyes visible, friendly and confident'}.
- thumbnail: still reads clearly as a small square thumbnail.
- light: good light, sharp, no muddy shadows.
- fresh: looks current and natural for 2026 social media, not dated stock photography.
- real: looks like a real photo — natural hands, skin, fabric and background, no warped text or objects.
Give one short tip (max 16 words, simple English) on how to post or use this photo for more engagement.
Pick best_for from: feed, story, listing, profile, ad.
Return JSON: {"criteria":{"stop":n,"subject":n,"thumbnail":n,"light":n,"fresh":n,"real":n},"tip":"...","best_for":"..."}`;

/** Deterministic stand-in for local mock mode (clearly not a real review). */
const mockDetails = (item: BatchItem): ScoreDetails => {
  const seed = [...item.id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 997, 7);
  const criteria = Object.fromEntries(SCORE_CRITERIA.map((c, i) => [c.id, 6 + ((seed >> i) % 4)])) as Record<ScoreCriterion, number>;
  return { version: 1, criteria, tip: 'Use this as the first photo in a carousel post.', bestFor: 'feed' };
};

const normalize = (raw: RawScore | null): ScoreDetails | null => {
  if (!raw?.criteria) return null;
  const criteria = Object.fromEntries(SCORE_CRITERIA.map((c) => [c.id, Math.round(Number(raw.criteria?.[c.id] ?? 0))])) as Record<ScoreCriterion, number>;
  const bestFor = (BEST_FOR as readonly string[]).includes(raw.best_for ?? '') ? (raw.best_for as ScoreDetails['bestFor']) : 'feed';
  return { version: 1, criteria, tip: String(raw.tip ?? '').slice(0, 140), bestFor };
};

/** Scores a ready item once and stores it. Never throws — a missing score just hides the badge. */
export const scoreItem = async (itemId: string): Promise<number | null> => {
  try {
    const item = await prisma.batchItem.findUnique({ where: { id: itemId }, include: { batch: { select: { workspace: { select: { product: true } } } } } });
    if (!item?.r2Key || item.status !== 'ready') return null;
    let details: ScoreDetails | null;
    if (!isOpenAiEnabled()) {
      details = mockDetails(item);
    } else {
      const image = await imageDataUrl(item.r2Key);
      if (!image) return null;
      const product = item.batch.workspace.product === 'shop' ? 'shop' : 'brand';
      details = normalize(await chatJson<RawScore>([
        { role: 'system', content: systemPrompt(product) },
        { role: 'user', content: [{ type: 'text', text: 'Score this photo.' }, { type: 'image_url', image_url: { url: image, detail: 'low' } }] },
      ], { maxTokens: 200, temperature: 0.2, timeoutMs: 15_000 }));
    }
    if (!details) return null;
    const score = totalScore(details.criteria);
    await prisma.batchItem.update({ where: { id: item.id }, data: { score, scoreDetails: details } });
    return score;
  } catch (err) {
    console.error('[score] failed', itemId, err);
    return null;
  }
};
