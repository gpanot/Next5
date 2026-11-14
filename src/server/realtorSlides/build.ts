// server-only — never import from a 'use client' file.
// One listing slideshow end to end: photos → (places) → words → slides in the theme → JPEGs in R2. Shared by the
// Autopilot posts (make.ts) and "Slideshows of this home" (listingSlideshows.ts).

import type { Listing } from '@prisma/client';
import { uploadToR2 } from '../../lib/r2';
import type { ListingSlideshowKind } from '../../lib/realtorPlaybooks';
import type { SlideTheme } from '../../lib/slideThemes';
import type { PlaybookSlide } from '../../types/business/campaigns';
import { placeOf } from '../campaigns/playbook';
import { factsOf } from '../realtorVideo/jobs';
import { writeSlideshow } from './copy';
import { nearbyPlaces } from './neighborhood';
import { galleryOf, photosFor } from './photos';
import { renderThemedSlides } from './themeRender';

export type BuildInput = {
  listing: Listing;
  kind: ListingSlideshowKind;
  theme: SlideTheme;
  /** Moment facts the writer must use as given (open house hours, prices); empty outside a plan. */
  moment: string;
  ctaLine: string;
  /** Appends the agent's disclosure line to the caption. */
  withDisclosure: (caption: string) => string;
  /** R2 key of slide i. */
  keyOf: (i: number) => string;
};

const addressLine = (address: unknown): string => {
  const a = (address ?? {}) as { full?: string | null; street?: string | null; city?: string | null; state?: string | null };
  return a.full ?? [a.street, a.city, a.state].filter(Boolean).join(', ');
};

/** Writes, renders and stores one slideshow. Throws on any failure; the caller writes it on its row. */
export const buildSlideshow = async (input: BuildInput): Promise<{ slides: PlaybookSlide[]; caption: string }> => {
  const { listing, kind } = input;
  const photos = photosFor(kind, galleryOf(listing.candidates));
  if (photos.length < 3) throw new Error('This home needs at least 3 photos for a slideshow.');
  const [facts, places] = await Promise.all([factsOf(listing), kind === 'neighborhood' ? nearbyPlaces(addressLine(listing.address)) : []]);
  const written = await writeSlideshow({ kind, facts, street: placeOf(listing.address).street, photos, places, moment: input.moment, ctaLine: input.ctaLine });
  const jpegs = await renderThemedSlides(input.theme, kind, written.slides, photos.map((p) => p.url));
  const slides = await Promise.all(
    written.slides.map(async (text, i) => {
      const key = input.keyOf(i);
      await uploadToR2(key, jpegs[i]!, 'image/jpeg');
      return { key, ...text };
    }),
  );
  return { slides, caption: input.withDisclosure(written.caption) };
};
