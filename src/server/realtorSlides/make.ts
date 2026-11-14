// server-only — never import from a 'use client' file.
// Makes one playbook slideshow in the plan's theme (build.ts) and writes it on the post row.

import type { Listing } from '@prisma/client';
import { prisma } from '../../lib/db';
import { disclosureLine, momentLine, withDisclosure } from '../../lib/playbookMoment';
import { beatOf, CTA_LINES, isCardKind } from '../../lib/realtorPlaybooks';
import { slideThemeOf } from '../../lib/slideThemes';
import { buildSlideshow } from './build';

const slideKey = (postId: string, i: number) => `campaign-posts/${postId}/slide-${i + 1}.jpg`;

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
      select: { beatKey: true, campaign: { select: { playbook: true, slideTheme: true, eventAt: true, eventEndAt: true, newPriceCents: true, oldPriceCents: true, workspace: { select: { agentName: true, brokerage: true } } } } },
    });
    const beat = beatOf(post.beatKey);
    const kind = beat?.slideshow;
    if (!kind || kind === 'market_stats' || isCardKind(kind)) throw new Error(`No listing slideshow for beat ${post.beatKey}`);
    const c = post.campaign;
    const moment = momentLine(c.playbook, { ...c, daysOnMarket: listing.daysOnMarket });

    const disclosure = disclosureLine(c.workspace.agentName, c.workspace.brokerage);
    const { slides, caption } = await buildSlideshow({
      listing, kind, theme: slideThemeOf(c.slideTheme), moment, ctaLine: CTA_LINES[beat.cta ?? 'tour'].line,
      withDisclosure: (text) => withDisclosure(text, disclosure), keyOf: (i) => slideKey(postId, i),
    });

    await prisma.campaignPost.update({
      where: { id: postId },
      data: { slides: slides as object[], caption, mediaStatus: 'ready', mediaError: null },
    });
    // Calendar rows were booked before the words existed; give them the caption now (unless she already edited it).
    await prisma.postSlot.updateMany({ where: { campaignPostId: postId, captionOverride: null }, data: { captionOverride: caption } });
  } catch (err) {
    console.error(`[playbook] slideshow ${postId} failed:`, err);
    await fail(postId, err);
  }
};
