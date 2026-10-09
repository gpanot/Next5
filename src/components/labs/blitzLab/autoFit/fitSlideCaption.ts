'use client';

import { slideTextConfig } from '../../../../remotion/slideTextConfig';
import type { TextConfig } from '../../../../remotion/types';
import type { LabClient } from '../../labClient';
import { blitzApi, type BlitzAssetDto } from '../api';
import { buildCaptionSnapshot } from './snapshot';

export type SlideFitInput = {
  backgroundKey: string;
  text: string;
  /** The slide's place in its video: the hook and the CTA may have their own look. */
  index: number;
  count: number;
  /** Where the caption is now (its bottom edge); the slideshow's position when absent. */
  positionY?: number;
  textConfig: TextConfig;
  assets: BlitzAssetDto[];
  businessText?: string;
};

const isImageKey = (key: string) => /\.(jpe?g|png|webp|gif|avif)$/i.test(key);

/**
 * One caption Auto Fit on one slide: a snapshot of its picture with the caption as it is drawn, then the vision model
 * places the caption off faces on a calm area. Throws when it fails (callers keep the caption where it is).
 */
export async function fitSlideCaption(client: LabClient, input: SlideFitInput): Promise<{ positionY: number; reason: string }> {
  const key = input.backgroundKey;
  const asset = input.assets.find((a) => a.r2Key === key);
  const snap = await buildCaptionSnapshot({
    backgroundUrl: asset?.url ?? `/api/admin/blitz/proxy?key=${encodeURIComponent(key)}`,
    backgroundIsImage: asset ? asset.mediaKind === 'image' : isImageKey(key),
    captionText: input.text,
    textConfig: { ...slideTextConfig(input.textConfig, input.index, input.count), ...(input.positionY != null ? { positionY: input.positionY } : {}) },
    businessText: input.businessText,
  });
  const res = await blitzApi.autoFitCaption(client, { ...snap, captionText: input.text });
  if (!res.ok) throw new Error(res.data.error ?? 'Auto Fit failed — try again');
  return { positionY: res.data.captionPositionY, reason: res.data.reason };
}
