'use client';

import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { useLabClient } from '../LabClientProvider';
import type { BlitzAssetDto } from './api';
import type { SlideData } from './SlidePreview';
import type { ZillowData } from './ZillowScrapeStep';

type Options = {
  zillowData: ZillowData | null;
  addAsset: (asset: BlitzAssetDto) => void;
  setSlides: Dispatch<SetStateAction<SlideData[]>>;
};

/**
 * Imports the selected listing photos into R2 and gives each slide without a background the photo
 * whose tag it asked for.
 * Each photo is used once while unused photos remain; with fewer photos than slides
 * (e.g. 2-photo mode) the slide reuses its preferred photo instead of staying blank.
 */
export function useListingPhotoImport({ zillowData, addAsset, setSlides }: Options) {
  const client = useLabClient();

  return useCallback((slideTags: string[]) => {
    if (!zillowData) return;
    const poolTags = zillowData.selectedCandidates.map((_, i) =>
      zillowData.photoTags[i] ?? (i === 0 ? 'exterior' : 'other'),
    );
    const preferred = slideTags.map((tag) => Math.max(poolTags.indexOf(tag), 0));

    fetch(client.url('/blitz/import-photos'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...client.authHeaders() },
      body: JSON.stringify({
        photoUrls: zillowData.selectedCandidates.map((c) => c.url),
        listingRunId: zillowData.listingRunId,
      }),
    })
      .then((res) => res.json() as Promise<{ assets?: BlitzAssetDto[] }>)
      .then((data) => {
        const imported = data.assets ?? [];
        if (imported.length === 0) return;
        imported.forEach(addAsset);
        const keys = poolTags.map((_, i) => imported[i]?.r2Key ?? null);
        // The Set lives inside the updater so it stays pure under StrictMode's double call.
        setSlides((prev) => {
          const used = new Set<number>();
          return prev.map((slide, slideIdx) => {
            // Slides that already hold a library clip keep it.
            if (slide.backgroundKey) return slide;
            const target = preferred[slideIdx] ?? 0;
            const offsets = keys.map((_, o) => (target + o) % keys.length);
            const idx = offsets.find((i) => keys[i] && !used.has(i)) ?? (keys[target] ? target : undefined);
            if (idx === undefined) return slide;
            used.add(idx);
            return { ...slide, backgroundKey: keys[idx]! };
          });
        });
      })
      // Import errors are non-blocking: the user can still pick backgrounds by hand.
      .catch((e) => console.error('[listing import-photos] error:', e));
  }, [zillowData, client, addAsset, setSlides]);
}
