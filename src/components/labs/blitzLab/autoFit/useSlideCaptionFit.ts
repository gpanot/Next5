'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import { slideTextConfig } from '../../../../remotion/slideTextConfig';
import type { TextConfig } from '../../../../remotion/types';
import { useLabClient } from '../../LabClientProvider';
import { blitzApi, type BlitzAssetDto } from '../api';
import type { SlideData } from '../SlidePreview';
import { isLocalKey } from '../useBlitzUploads';
import { buildCaptionSnapshot } from './snapshot';

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
};

const isImageKey = (key: string) => /\.(jpe?g|png|webp|gif|avif)$/i.test(key);

/**
 * Slideshow "Auto Fit" (same CTA as the green-screen editor's): snapshot the current slide, let the vision model
 * place its caption off faces on a calm area of the picture, apply it to that slide. Returns AutoFitButton's props.
 */
export function useSlideCaptionFit(o: Options) {
  const client = useLabClient();
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
    const asset = o.assets.find((a) => a.r2Key === key);
    setBusy(true);
    setResult(null);
    try {
      const snap = await buildCaptionSnapshot({
        backgroundUrl: asset?.url ?? `/api/admin/blitz/proxy?key=${encodeURIComponent(key)}`,
        backgroundIsImage: asset ? asset.mediaKind === 'image' : isImageKey(key),
        captionText: text,
        textConfig: { ...slideTextConfig(o.textConfig, index, o.slides.length), ...(slide.positionY != null ? { positionY: slide.positionY } : {}) },
        businessText: o.businessText,
      });
      const res = await blitzApi.autoFitCaption(client, { ...snap, captionText: text });
      if (!res.ok) throw new Error(res.data.error ?? 'Auto Fit failed — try again');
      const positionY = res.data.captionPositionY;
      o.setSlides((prev) => prev.map((s, i) => (i === index ? { ...s, positionY } : s)));
      setResult({ index, error: null, reason: res.data.reason });
    } catch (err) {
      setResult({ index, error: err instanceof Error ? err.message : 'Auto Fit failed — try again', reason: null });
    } finally {
      setBusy(false);
    }
  };

  const mine = result?.index === o.currentIndex ? result : null;
  return { onClick: () => void run(), busy, disabledReason, error: mine?.error ?? null, reason: mine?.reason ?? null };
}
