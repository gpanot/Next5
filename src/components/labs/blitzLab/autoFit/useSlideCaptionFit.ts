'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import type { TextConfig } from '../../../../remotion/types';
import { useLabClient } from '../../LabClientProvider';
import type { BlitzAssetDto } from '../api';
import type { SlideData } from '../SlidePreview';
import { isLocalKey } from '../useBlitzUploads';
import { fitSlideCaption } from './fitSlideCaption';
import { useAutoCaptionRefit } from './useAutoCaptionRefit';

type Options = {
  slides: SlideData[];
  /** The new caption height lands on the current slide (positionY, which the preview and render read per slide). */
  setSlides: Dispatch<SetStateAction<SlideData[]>>;
  currentIndex: number;
  assets: BlitzAssetDto[];
  /** Background used when the slide has none of its own. */
  fallbackBackgroundKey: string;
  textConfig: TextConfig;
  businessText?: string;
  /** The deck card open in the editor: its slides are fitted again on their own when their picture or line changes. */
  autoRefitCardId?: string | null;
};

/**
 * Slideshow "Auto Fit" (same CTA as the green-screen editor's): snapshot the current slide, let the vision model
 * place its caption off faces on a calm area of the picture, apply it to that slide. Returns AutoFitButton's props.
 */
export function useSlideCaptionFit(o: Options) {
  const client = useLabClient();
  useAutoCaptionRefit({ ...o, cardId: o.autoRefitCardId ?? null });
  const [busy, setBusy] = useState(false);
  // Error and reason belong to the slide they were made for.
  const [result, setResult] = useState<{ index: number; error: string | null; reason: string | null } | null>(null);
  const slide = o.slides[o.currentIndex];
  const key = slide?.backgroundKey || o.fallbackBackgroundKey;
  const text = slide?.text.trim() ?? '';

  const disabledReason = !key ? 'Pick a background for this slide'
    : isLocalKey(key) ? 'Wait for uploads to finish'
    : !text ? 'Write this slide\'s text first'
    : null;

  const run = async () => {
    if (disabledReason || !slide) return;
    const index = o.currentIndex;
    setBusy(true);
    setResult(null);
    try {
      const fit = await fitSlideCaption(client, {
        backgroundKey: key, text, index, count: o.slides.length, positionY: slide.positionY,
        textConfig: o.textConfig, assets: o.assets, businessText: o.businessText,
      });
      const positionY = fit.positionY;
      o.setSlides((prev) => prev.map((s, i) => (i === index ? { ...s, positionY } : s)));
      setResult({ index, error: null, reason: fit.reason });
    } catch (err) {
      setResult({ index, error: err instanceof Error ? err.message : 'Auto Fit failed — try again', reason: null });
    } finally {
      setBusy(false);
    }
  };

  const mine = result?.index === o.currentIndex ? result : null;
  return { onClick: () => void run(), busy, disabledReason, error: mine?.error ?? null, reason: mine?.reason ?? null };
}
