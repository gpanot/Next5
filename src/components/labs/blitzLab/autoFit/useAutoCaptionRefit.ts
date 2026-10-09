'use client';

import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import type { TextConfig } from '../../../../remotion/types';
import { useLabClient } from '../../LabClientProvider';
import type { BlitzAssetDto } from '../api';
import type { SlideData } from '../SlidePreview';
import { isLocalKey } from '../useBlitzUploads';
import { fitSlideCaption } from './fitSlideCaption';

type Options = {
  /** The deck card open in the editor; null = no card, nothing is fitted on its own. */
  cardId: string | null;
  slides: SlideData[];
  setSlides: Dispatch<SetStateAction<SlideData[]>>;
  assets: BlitzAssetDto[];
  fallbackBackgroundKey: string;
  textConfig: TextConfig;
  businessText?: string;
};

/** Typing pauses this long before a changed slide is fitted again. */
const REFIT_DELAY_MS = 1500;

/** What a fitted caption depends on: the picture (clip and trim) and the line. */
const fitKey = (s: SlideData, fallbackKey: string) => `${s.backgroundKey || fallbackKey}|${s.trimStart ?? 0}|${s.text.trim()}`;

/**
 * Deck cards open with every caption fitted (deck generation). When a slide's picture or line changes in the editor
 * (a swap, a regenerated photo, an edited line), its caption is fitted again on its own: one attempt per change, and a
 * failure keeps the caption where it is. A drag after the fit stays, since the picture and line did not change.
 */
export function useAutoCaptionRefit(o: Options) {
  const client = useLabClient();
  const latest = useRef(o);
  // First effect of the hook: the ones below read this commit's options.
  useEffect(() => { latest.current = o; });
  /** Per slide: the picture + line its caption was last fitted (or opened) for. */
  const fittedFor = useRef<string[]>([]);
  const signature = o.slides.map((s) => fitKey(s, o.fallbackBackgroundKey)).join('\n');

  // A card opens fitted: its slides as they open are the baseline. Declared first, so it runs before the check below.
  useEffect(() => {
    const cur = latest.current;
    fittedFor.current = cur.slides.map((s) => fitKey(s, cur.fallbackBackgroundKey));
  }, [o.cardId]);

  useEffect(() => {
    if (!o.cardId) return;
    const refit = async (index: number, key: string) => {
      const cur = latest.current;
      const slide = cur.slides[index]!;
      try {
        const fit = await fitSlideCaption(client, {
          backgroundKey: slide.backgroundKey || cur.fallbackBackgroundKey, text: slide.text.trim(), index, count: cur.slides.length,
          positionY: slide.positionY, textConfig: cur.textConfig, assets: cur.assets, businessText: cur.businessText,
        });
        // Only if the slide still shows what was fitted (the user may have typed on).
        cur.setSlides((prev) => prev.map((s, i) => (i === index && fitKey(s, latest.current.fallbackBackgroundKey) === key ? { ...s, positionY: fit.positionY } : s)));
      } catch (err) {
        console.warn(`[caption-fit] slide ${index + 1} not fitted again; the caption keeps its position:`, err instanceof Error ? err.message : err);
      }
    };
    const timer = setTimeout(() => {
      const cur = latest.current;
      cur.slides.forEach((slide, i) => {
        const key = fitKey(slide, cur.fallbackBackgroundKey);
        const picture = slide.backgroundKey || cur.fallbackBackgroundKey;
        if (fittedFor.current[i] === key || isLocalKey(picture)) return; // unchanged, or still uploading
        fittedFor.current[i] = key;
        if (picture && slide.text.trim()) void refit(i, key);
      });
    }, REFIT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [o.cardId, signature, client]);
}
