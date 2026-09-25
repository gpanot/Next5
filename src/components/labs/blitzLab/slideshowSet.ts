// A "Set" is everything needed to re-open a rendered slideshow and edit it again (Remix):
// the slides themselves live in BlitzProject.currentAssets (text, clip, trim, caption position,
// length, music, text style); `currentAssets.set` adds where it came from and the swaps.

import type { TextConfig } from '../../../remotion/types';
import type { BlitzProjectDto } from './api';
import type { CopyCheckContext } from './deckApi';
import type { SlideData } from './SlidePreview';
import type { ShotView } from './SwipeCard';
import type { DeckCardData } from './SwipeDeck';

export type SlideshowSet = {
  version: 1;
  /** 'deck' = a 7-shot engine video (fixed format, swaps, guardrail check); 'free' = free-form slideshow. */
  kind: 'deck' | 'free';
  variantId?: string;
  lensId?: string;
  lensLabel?: string;
  hookStyle?: string;
  /** Deck: the card's shots with their engine data (runner-up clips for one-tap swap). */
  shots?: ShotView[];
  /** Deck: what edited copy is re-checked against before render. */
  check?: CopyCheckContext;
  audio?: DeckCardData['audio'];
};

/** The Set saved with a render. */
export function buildSet(card: DeckCardData | null, slides: SlideData[]): SlideshowSet {
  if (!card) return { version: 1, kind: 'free' };
  return {
    version: 1,
    kind: 'deck',
    variantId: card.variantId,
    lensId: card.lensId,
    lensLabel: card.lensValue,
    hookStyle: card.hookStyle,
    check: card.check,
    audio: card.audio,
    shots: card.shots.map((shot, i) => {
      const slide = slides[i];
      if (!slide) return shot;
      return {
        ...shot,
        text: slide.text,
        edit: shot.edit && { ...shot.edit, assetKey: slide.backgroundKey, trimStart: slide.trimStart, positionY: slide.positionY },
      };
    }),
  };
}

type StoredAssets = {
  slides?: Array<string | SlideData>;
  audioKey?: string;
  textConfigOverride?: Partial<TextConfig>;
  businessText?: string;
  muteVideoAudio?: boolean;
  set?: SlideshowSet;
};

export type RemixData = {
  slides: SlideData[];
  audioKey?: string;
  textConfigOverride: Partial<TextConfig>;
  businessText?: string;
  muteVideoAudio: boolean;
  set: SlideshowSet;
};

/** Reads a render back into editor state. Renders made before Sets existed come back as 'free'. */
export function readRemix(project: BlitzProjectDto): RemixData | null {
  const assets = project.currentAssets as StoredAssets | null;
  if (!assets?.slides?.length) return null;
  const slides = assets.slides.map((s) => (typeof s === 'string' ? { text: s } : s));
  const set = assets.set?.version === 1 ? assets.set : { version: 1 as const, kind: 'free' as const };
  return {
    slides,
    audioKey: assets.audioKey,
    textConfigOverride: assets.textConfigOverride ?? {},
    businessText: assets.businessText,
    muteVideoAudio: Boolean(assets.muteVideoAudio),
    set: set.kind === 'deck' && set.shots?.length === slides.length ? set : { ...set, kind: 'free' },
  };
}

/** A deck Set back as a card the editor can open (fixed format, swaps, check). */
export function cardFromSet(projectId: string, set: SlideshowSet): DeckCardData {
  return {
    id: `remix-${projectId}`,
    variantId: set.variantId,
    lensValue: set.lensLabel ?? 'Remix',
    lensId: set.lensId ?? 'remix',
    hookStyle: set.hookStyle ?? 'Remix',
    shots: set.shots ?? [],
    audio: set.audio,
    check: set.check,
    status: 'kept',
    edited: true,
  };
}
