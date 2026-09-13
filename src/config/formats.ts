/**
 * Output formats. Each format is generated natively at its aspect ratio.
 * Spec: docs/business-studios/01-product-spec.md §1 (Formats).
 */

export type FormatId = 'portrait_4_5' | 'story_9_16' | 'square_1_1' | 'portrait_3_4';

export type Format = {
  id: FormatId;
  ratio: '4:5' | '9:16' | '1:1' | '3:4';
  label: string;
  usedFor: string;
  filenameSuffix: string;
  /** CSS aspect-ratio value, e.g. "4 / 5". */
  cssAspect: string;
};

export const FORMATS: Record<FormatId, Format> = {
  portrait_4_5: {
    id: 'portrait_4_5',
    ratio: '4:5',
    label: 'Instagram feed',
    usedFor: 'Instagram and Facebook feed posts',
    filenameSuffix: '4x5',
    cssAspect: '4 / 5',
  },
  story_9_16: {
    id: 'story_9_16',
    ratio: '9:16',
    label: 'Stories & TikTok',
    usedFor: 'Stories, Reels covers and TikTok',
    filenameSuffix: '9x16',
    cssAspect: '9 / 16',
  },
  square_1_1: {
    id: 'square_1_1',
    ratio: '1:1',
    label: 'Listing / square',
    usedFor: 'Shopee, TikTok Shop main image, LinkedIn',
    filenameSuffix: '1x1',
    cssAspect: '1 / 1',
  },
  portrait_3_4: {
    id: 'portrait_3_4',
    ratio: '3:4',
    label: 'Classic portrait',
    usedFor: 'Website, Zalo and print',
    filenameSuffix: '3x4',
    cssAspect: '3 / 4',
  },
};

export const FORMAT_IDS: readonly FormatId[] = ['portrait_4_5', 'story_9_16', 'square_1_1', 'portrait_3_4'];

export const isFormatId = (value: string): value is FormatId => value in FORMATS;
