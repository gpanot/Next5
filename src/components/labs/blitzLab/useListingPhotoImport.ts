'use client';

import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { useLabClient } from '../LabClientProvider';
import type { BlitzAssetDto, LabClient } from './api';
import type { SlideData } from './SlidePreview';
import type { ZillowData } from './ZillowScrapeStep';

/** Imports the selected listing photos into R2. Resolves to the saved assets, in pick order. */
export async function fetchListingPhotos(client: LabClient, zillowData: ZillowData): Promise<BlitzAssetDto[]> {
  const res = await fetch(client.url('/blitz/import-photos'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...client.authHeaders() },
    body: JSON.stringify({
      photoUrls: zillowData.selectedCandidates.map((c) => c.url),
      listingRunId: zillowData.listingRunId,
    }),
  });
  const data = (await res.json()) as { assets?: BlitzAssetDto[] };
  return data.assets ?? [];
}

/**
 * Gives each slide without a background the imported photo whose tag it asked for.
 * Each photo is used once while unused photos remain; with fewer photos than slides
 * (e.g. 2-photo mode) the slide reuses its preferred photo instead of staying blank.
 */
export function fillListingBackgrounds(
  slides: SlideData[],
  slideTags: string[],
  zillowData: ZillowData,
  imported: BlitzAssetDto[],
): SlideData[] {
  const poolTags = zillowData.selectedCandidates.map((_, i) =>
    zillowData.photoTags[i] ?? (i === 0 ? 'exterior' : 'other'),
  );
  const preferred = slideTags.map((tag) => Math.max(poolTags.indexOf(tag), 0));
  const keys = poolTags.map((_, i) => imported[i]?.r2Key ?? null);
  const used = new Set<number>();
  return slides.map((slide, slideIdx) => {
    // Slides that already hold a library clip keep it.
    if (slide.backgroundKey) return slide;
    const target = preferred[slideIdx] ?? 0;
    const offsets = keys.map((_, o) => (target + o) % keys.length);
    const idx = offsets.find((i) => keys[i] && !used.has(i)) ?? (keys[target] ? target : undefined);
    if (idx === undefined) return slide;
    used.add(idx);
    return { ...slide, backgroundKey: keys[idx]! };
  });
}

type Options = {
  zillowData: ZillowData | null;
  addAsset: (asset: BlitzAssetDto) => void;
  setSlides: Dispatch<SetStateAction<SlideData[]>>;
};

/** Imports the listing photos and fills the open slides that have no background. */
export function useListingPhotoImport({ zillowData, addAsset, setSlides }: Options) {
  const client = useLabClient();

  return useCallback((slideTags: string[]) => {
    if (!zillowData) return;
    fetchListingPhotos(client, zillowData)
      .then((imported) => {
        if (imported.length === 0) return;
        imported.forEach(addAsset);
        // Pure updater: safe under StrictMode's double call.
        setSlides((prev) => fillListingBackgrounds(prev, slideTags, zillowData, imported));
      })
      // Import errors are non-blocking: the user can still pick backgrounds by hand.
      .catch((e) => console.error('[listing import-photos] error:', e));
  }, [zillowData, client, addAsset, setSlides]);
}
