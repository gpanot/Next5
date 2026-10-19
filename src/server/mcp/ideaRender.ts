// server-only — never import from a 'use client' file.
// A Blitz calendar idea's render request, built on the server: what the Content page's "keep" sends from the browser
// (src/components/labs/blitzLab/deckRenderBody.ts with ideaCards.ts, toSlide and buildSet), so Claude can put an idea
// on the calendar with no browser. Keep the two in step: same template, slides, voice, text style and Set.

import { prisma } from '../../lib/db';
import { BLITZ_SLIDESHOW_TEXT_DEFAULTS } from '../../config/blitzLab';
import { DEFAULT_BLITZ_VOICE } from '../../types/admin/blitzVoice';
import type { SlideCamera } from '../../remotion/types';
import type { DeckItem, DeckShot } from '../slideshow/core/deckAssembly';
import type { RenderBody } from '../labs/blitzRender';

type Slide = { text: string; backgroundKey?: string; trimStart?: number; positionY?: number; durationSec?: number; camera?: SlideCamera };

/** A deck shot as the editor's ShotView (SlideshowDeckStep.toShotView), with the slide's edits (slideshowSet.buildSet). */
const setShot = (shot: DeckShot, slide: Slide) => ({
  text: slide.text,
  textZone: shot.textZone,
  mediaUrl: shot.mediaUrl || undefined,
  mediaKind: shot.mediaKind,
  mediaLabel: shot.mediaLabel,
  photoTag: shot.photoTag,
  edit: {
    source: shot.source,
    assetKey: slide.backgroundKey,
    trimStart: slide.trimStart,
    positionY: slide.positionY,
    durationSec: shot.durationSec,
    alternatives: shot.alternatives,
  },
});

/** The card's shots as render slides (useDeckCardEditor.toSlide). */
export const slidesOf = (card: DeckItem): Slide[] =>
  card.shots.map((shot) => ({ text: shot.text, backgroundKey: shot.assetKey, trimStart: shot.trimStart, positionY: shot.positionY, durationSec: shot.durationSec, camera: shot.camera }));

/** Pure part, for tests: the body for `card` with the carousel template `templateId`, or why it cannot render yet. */
export function buildIdeaRenderBody(card: DeckItem, ideaId: string, templateId: string): { body: RenderBody } | { error: string } {
  if (card.finishing) return { error: 'This video is still being finished (pictures are being made). Try again in a few minutes.' };
  const slides = slidesOf(card);
  if (slides.length === 0 || slides.some((s) => !s.backgroundKey)) return { error: 'Some shots have no photo yet. Open the idea in Next5 and pick one.' };
  return {
    body: {
      templateId,
      // No music (since 2026-10-12): the server narrates the video in the card's voice and times the slides to it.
      currentAssets: { backgroundKey: slides[0]!.backgroundKey! },
      voice: card.voice ?? DEFAULT_BLITZ_VOICE,
      overlayZoom: 1.0,
      overlayOffsetX: 0,
      overlayOffsetY: 0,
      mentionBusiness: false,
      captionText: slides[0]?.text ?? '',
      slides,
      durationSeconds: slides.reduce((sum, s) => sum + (s.durationSec ?? 0), 0),
      textConfigOverride: { ...BLITZ_SLIDESHOW_TEXT_DEFAULTS },
      set: {
        version: 1,
        kind: 'deck',
        variantId: ideaId,
        lensId: card.lensId,
        lensLabel: card.lensLabel,
        hookStyle: card.hookStyle,
        audio: card.audio,
        shots: card.shots.map((shot, i) => setShot(shot, slides[i]!)),
      },
    },
  };
}

/** The template a deck video renders with: the first CAROUSEL template, as the Content page picks it. */
export async function carouselTemplateId(): Promise<string | null> {
  const t = await prisma.blitzTemplate.findFirst({ where: { type: 'CAROUSEL' }, orderBy: { createdAt: 'asc' }, select: { id: true } });
  return t?.id ?? null;
}
