'use client';

import type { TextConfig } from '../../../remotion/types';
import type { blitzApi, BlitzAssetDto, BlitzTemplateDto, LabClient } from './api';
import { checkDeckCopy, type CopyCheckContext } from './deckApi';
import { SHOT_FORMAT } from './shotFormat';
import { buildSet } from './slideshowSet';
import type { SlideData } from './SlidePreview';
import type { DeckCardData } from './SwipeDeck';

export type RenderBody = Parameters<typeof blitzApi.triggerRender>[1];

export type RenderBodyContext = {
  template: BlitzTemplateDto | null;
  assets: BlitzAssetDto[];
  textOverride: Partial<TextConfig>;
  /** What the copy is checked against when the card carries no `check` of its own. */
  checkContext: CopyCheckContext | null;
};

/**
 * The render request for a deck card exactly as it is, or why it cannot render yet. What "Generate" sends and what
 * scheduling saves. `slides` are the card's shots as render slides (listing photos already filled in).
 */
export async function deckRenderBody(client: LabClient, card: DeckCardData, slides: SlideData[], ctx: RenderBodyContext): Promise<{ body: RenderBody } | { error: string }> {
  if (!ctx.template) return { error: 'No slideshow template loaded.' };
  if (slides.some((s) => !s.backgroundKey)) return { error: 'Some shots have no photo. Tap Edit to pick one.' };
  const context = card.check ?? ctx.checkContext;
  const problems = context ? await checkDeckCopy(client, context, slides.map((s) => s.text)) : [];
  if (problems.length > 0) return { error: `Fix before rendering: ${problems.join(' ')}` };
  const audioKey = card.audio?.assetKey ?? ctx.assets.find((a) => a.type === 'AUDIO')?.r2Key;
  return {
    body: {
      templateId: ctx.template.id,
      currentAssets: { backgroundKey: slides[0]!.backgroundKey!, ...(audioKey ? { audioKey } : {}) },
      overlayZoom: 1.0,
      overlayOffsetX: 0,
      overlayOffsetY: 0,
      mentionBusiness: false,
      captionText: slides[0]?.text ?? '',
      slides,
      durationSeconds: slides.reduce((sum, s, i) => sum + (s.durationSec ?? SHOT_FORMAT[i]?.durationSec ?? 0), 0),
      textConfigOverride: ctx.textOverride,
      set: buildSet(card, slides),
    },
  };
}
