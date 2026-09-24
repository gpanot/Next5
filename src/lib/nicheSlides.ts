'use client';

/**
 * Niche-aware slide copy for the Researcher's "See Template" panel.
 *
 * The Phase 0A templates ship with generic example slides full of [BRACKETS].
 * Once the user has searched a niche, those placeholders can be filled in by
 * the LLM using the niche and the source video's own transcript, so the
 * suggested slides — and their background image prompts — are ready to post.
 *
 * Results are memoised per (client, niche, video, template) for the page session: expanding a
 * card twice, then clicking "Use as inspiration", costs one call. The client is part of the key
 * so two workspaces never read each other's generated copy out of the cache.
 */

import { errorOf, type LabClient } from '../components/labs/labClient';

export type NicheSlide = { text: string; bgPrompt: string };

export type NicheSlideMeta = {
  elapsedMs: number;
  promptTokens: number;
  completionTokens: number;
};

export type NicheSlidesResult = {
  slides: NicheSlide[];
  /** false when the LLM was unavailable and these are localised static slides. */
  generated: boolean;
  /** Token usage and timing from the API call. */
  meta?: NicheSlideMeta;
};

type Request = {
  niche: string;
  templateId: number;
  videoId: string;
  hook?: string;
  transcript?: string;
};

const cache = new Map<string, Promise<NicheSlidesResult>>();

const cacheKeyOf = (client: LabClient, req: Request): string =>
  `${client.id}|${req.niche.trim().toLowerCase()}|${req.videoId}|${req.templateId}`;

async function fetchSlides(client: LabClient, req: Request): Promise<NicheSlidesResult> {
  const res = await client.request<Partial<NicheSlidesResult>>(
    '/blitz/generate-slides',
    {
      json: {
        niche: req.niche.trim(),
        templateId: req.templateId,
        hook: req.hook ?? '',
        transcript: req.transcript ?? '',
      },
    },
  );
  if (!res.ok || !Array.isArray(res.data.slides) || res.data.slides.length === 0) {
    throw new Error(res.ok ? 'No slides returned' : errorOf(res));
  }
  return { slides: res.data.slides, generated: res.data.generated ?? true, meta: res.data.meta };
}

/**
 * Generated slides for this niche + video + template, from cache when possible.
 * A failed call is not cached, so the next call retries.
 */
export function getNicheSlides(client: LabClient, req: Request): Promise<NicheSlidesResult> {
  const key = cacheKeyOf(client, req);
  const hit = cache.get(key);
  if (hit) return hit;

  const pending = fetchSlides(client, req).catch((err: unknown) => {
    cache.delete(key);
    throw err;
  });
  cache.set(key, pending);
  return pending;
}

/** Drops the memoised result so the next call regenerates. */
export function forgetNicheSlides(client: LabClient, req: Request): void {
  cache.delete(cacheKeyOf(client, req));
}
