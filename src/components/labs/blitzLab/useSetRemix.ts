'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { TextConfig } from '../../../remotion/types';
import type { BlitzProjectDto } from './api';
import type { CurrentAssets } from './AssetsPanel';
import type { SlideData } from './SlidePreview';
import { cardFromSet, readRemix } from './slideshowSet';
import type { DeckCardData } from './SwipeDeck';

type Options = {
  setSlides: Dispatch<SetStateAction<SlideData[]>>;
  setCurrentSlideIndex: (i: number) => void;
  setCurrentAssets: Dispatch<SetStateAction<CurrentAssets>>;
  setMentionBusiness: (on: boolean) => void;
  setBusinessText: (text: string) => void;
  setMuteVideoAudio: (on: boolean) => void;
  setEditingCardId: (id: string | null) => void;
  text: { reset: () => void; patch: (p: Partial<TextConfig>) => void };
  /** Opens a deck Set as an editable card (fixed format, swaps, guardrail check). */
  openRemix: (card: DeckCardData, slides: SlideData[]) => void;
  /** Free-form Sets open in the plain editor. */
  showFreeEditor: () => void;
};

/**
 * Remix: re-open a rendered slideshow with everything it was made of (slides, clips, trims,
 * caption positions, music, text style, business line), ready to edit and render again.
 */
export function useSetRemix(o: Options) {
  return (project: BlitzProjectDto) => {
    const data = readRemix(project);
    if (!data) return;

    o.setCurrentAssets((prev) => ({ ...prev, audioKey: data.audioKey }));
    o.text.reset();
    o.text.patch(data.textConfigOverride);
    o.setMentionBusiness(Boolean(data.businessText));
    o.setBusinessText(data.businessText ?? '');
    o.setMuteVideoAudio(data.muteVideoAudio);

    if (data.set.kind === 'deck') {
      o.openRemix(cardFromSet(project.id, data.set), data.slides);
    } else {
      o.setEditingCardId(null);
      o.setSlides(data.slides);
      o.setCurrentSlideIndex(0);
      o.showFreeEditor();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
}
