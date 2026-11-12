// server-only — never import from a 'use client' file.
// Makes one playbook slideshow: photos → (places) → words → 9:16 JPEGs in R2 → the post row.

import type { Listing } from '@prisma/client';
import { prisma } from '../../lib/db';
import { uploadToR2 } from '../../lib/r2';
import { disclosureLine, momentLine, withDisclosure } from '../../lib/playbookMoment';
import { beatOf, CTA_LINES, isCardKind } from '../../lib/realtorPlaybooks';
import type { PlaybookSlide } from '../../types/business/campaigns';
import { renderSlide, type PhotoCache } from '../autoSlideshow/render';
import { placeOf } from '../campaigns/playbook';
import { factsOf } from '../realtorVideo/jobs';
import { writeSlideshow } from './copy';
import { nearbyPlaces } from './neighborhood';
import { framePhoto, galleryOf, photosFor } from './photos';

const slideKey = (postId: string, i: number) => `campaign-posts/${postId}/slide-${i + 1}.jpg`;

const addressLine = (address: unknown): string => {
  const a = (address ?? {}) as { full?: string | null; street?: string | null; city?: string | null; state?: string | null };
  return a.full ?? [a.street, a.city, a.state].filter(Boolean).join(', ');
};

const fail = (postId: string, err: unknown) =>
  prisma.campaignPost.update({
    where: { id: postId },
    data: { mediaStatus: 'failed', mediaError: (err instanceof Error ? err.message : String(err)).slice(0, 500) },
  });

/** Renders and stores one slideshow post. Never throws: a failure is written on the row. */
export const makeSlideshow = async (postId: string, listing: Listing): Promise<void> => {
  try {
    const post = await prisma.campaignPost.findUniqueOrThrow({
      where: { id: postId },
      select: { beatKey: true, campaign: { select: { playbook: true, eventAt: true, eventEndAt: true, newPriceCents: true, oldPriceCents: true, workspace: { select: { agentName: true, brokerage: true } } } } },
    });
    const beat = beatOf(post.beatKey);
    const kind = beat?.slideshow;
    if (!kind || kind === 'market_stats' || isCardKind(kind)) throw new Error(`No listing slideshow for beat ${post.beatKey}`);
    const c = post.campaign;
    const moment = momentLine(c.playbook, { ...c, daysOnMarket: listing.daysOnMarket });

    const photos = photosFor(kind, galleryOf(listing.candidates));
    const [facts, places] = await Promise.all([factsOf(listing), kind === 'neighborhood' ? nearbyPlaces(addressLine(listing.address)) : []]);
    const ctaLine = CTA_LINES[beat.cta ?? 'tour'].line;
    const written = await writeSlideshow({ kind, facts, street: placeOf(listing.address).street, photos, places, moment, ctaLine });
    const copy = { ...written, caption: withDisclosure(written.caption, disclosureLine(c.workspace.agentName, c.workspace.brokerage)) };

    // The cache maps each photo URL straight to its framed data URI, so renderSlide never looks in R2 for it.
    const cache: PhotoCache = new Map(photos.map((p) => [p.url, framePhoto(p.url)]));
    const slides: PlaybookSlide[] = await Promise.all(
      copy.slides.map(async (text, i) => {
        const { jpeg } = await renderSlide(text, photos[i]!.url, cache);
        const key = slideKey(postId, i);
        await uploadToR2(key, jpeg, 'image/jpeg');
        return { key, ...text };
      }),
    );

    await prisma.campaignPost.update({
      where: { id: postId },
      data: { slides: slides as object[], caption: copy.caption, mediaStatus: 'ready', mediaError: null },
    });
    // Calendar rows were booked before the words existed; give them the caption now (unless she already edited it).
    await prisma.postSlot.updateMany({ where: { campaignPostId: postId, captionOverride: null }, data: { captionOverride: copy.caption } });
  } catch (err) {
    console.error(`[playbook] slideshow ${postId} failed:`, err);
    await fail(postId, err);
  }
};
