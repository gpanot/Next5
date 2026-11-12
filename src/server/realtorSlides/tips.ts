// server-only — never import from a 'use client' file.
// Makes one tip carousel post (Evergreen, "Thinking of selling?", spotlight): words → designed cards → R2 → post row.
// Face mode when she picked her Brand Cast avatar; faceless otherwise — a normal output, never an error (§4.5).

import sharp from 'sharp';
import { prisma } from '../../lib/db';
import { areaLabel, parseMarketArea } from '../../lib/marketArea';
import { getObjectBuffer, uploadToR2 } from '../../lib/r2';
import { beatOf, CTA_LINES, type CtaKey } from '../../lib/realtorPlaybooks';
import type { PlaybookSlide } from '../../types/business/campaigns';
import { localSpots, type NearbyPlace } from './neighborhood';
import { renderTipCard, type TipCard } from './tipCards';
import { writeTips, type TipCopy } from './tipCopy';

const MIN_SPOTS = 3;
const slideKey = (postId: string, i: number) => `campaign-posts/${postId}/slide-${i + 1}.jpg`;

const PILL: Record<CtaKey, string> = { tour: 'Comment “TOUR”', rsvp: 'Comment “RSVP”', value: 'DM “VALUE”', buyer: 'DM “BUYER”' };

/** Her picked Brand Cast member (the avatar she confirmed), or null: faceless mode. */
const faceMember = async (workspaceId: string) => {
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { avatarConfirmedAt: true } });
  if (!ws?.avatarConfirmedAt) return null;
  return prisma.brandCastMember.findFirst({
    where: { workspaceId, archivedAt: null, status: 'ready', imageKey: { not: null } },
    orderBy: { slot: 'asc' },
    select: { imageKey: true },
  });
};

export const hasBrandFace = async (workspaceId: string): Promise<boolean> => Boolean(await faceMember(workspaceId));

/** Her picked Brand Cast photo as a JPEG data URI, or null (faceless mode). */
export const brandFace = async (workspaceId: string): Promise<string | null> => {
  const member = await faceMember(workspaceId);
  const raw = member?.imageKey ? await getObjectBuffer(member.imageKey) : null;
  if (!raw) return null;
  const jpeg = await sharp(raw).resize(1080, 1350, { fit: 'cover', position: 'top' }).jpeg({ quality: 88 }).toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
};

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

const cardsOf = (copy: TipCopy, face: string | null, cta: CtaKey, signature: string | null, places: NearbyPlace[]): TipCard[] => [
  { kind: 'hook', kicker: copy.kicker, title: copy.hook.title, body: copy.hook.body, face },
  ...copy.items.map((it, i): TipCard => ({
    kind: 'item', index: i + 1, total: copy.items.length, title: it.title, body: it.body,
    note: places[i] ? `Source: ${host(places[i].sourceUrl)}` : undefined,
  })),
  { kind: 'cta', title: copy.cta.title, body: copy.cta.body, pill: PILL[cta], face, signature },
];

const fail = (postId: string, message: string) =>
  prisma.campaignPost.update({ where: { id: postId }, data: { mediaStatus: 'failed', mediaError: message.slice(0, 500) } });

/** Her area as "Austin, TX": the saved market area, else the city of the plan's home, else none. */
const areaOf = (marketArea: unknown, address: unknown): string => {
  const area = parseMarketArea(marketArea);
  if (area) return areaLabel(area);
  const a = (address ?? {}) as { city?: string | null; state?: string | null };
  return a.city && a.state ? `${a.city}, ${a.state}` : '';
};

/** Renders and stores one tip carousel. Never throws: a failure is written on the row. */
export const makeTipSlideshow = async (postId: string, workspaceId: string): Promise<void> => {
  try {
    const post = await prisma.campaignPost.findUniqueOrThrow({
      where: { id: postId },
      select: { beatKey: true, campaign: { select: { listing: { select: { address: true } }, workspace: { select: { marketArea: true, agentName: true, brokerage: true } } } } },
    });
    const beat = beatOf(post.beatKey);
    if (!beat || (beat.slideshow !== 'tips' && beat.slideshow !== 'spotlight')) throw new Error(`No tip carousel for beat ${post.beatKey}`);
    const ws = post.campaign.workspace;
    const area = areaOf(ws.marketArea, post.campaign.listing?.address);
    const places = beat.slideshow === 'spotlight' ? (await localSpots(area)).slice(0, 5) : [];
    if (beat.slideshow === 'spotlight' && places.length < MIN_SPOTS) return void (await fail(postId, 'Not enough sourced places for your area. Try again later.'));

    const cta = beat.cta ?? 'value';
    const face = await brandFace(workspaceId).catch(() => null);
    const copy = await writeTips({ brief: beat.brief ?? beat.idea, area, places, ctaLine: CTA_LINES[cta].line, face: Boolean(face) });
    const signature = [ws.agentName, ws.brokerage].filter(Boolean).join(' · ') || null;
    const cards = cardsOf(copy, face, cta, signature, places);

    const slides: PlaybookSlide[] = await Promise.all(
      cards.map(async (card, i) => {
        const key = slideKey(postId, i);
        await uploadToR2(key, await renderTipCard(card), 'image/jpeg');
        return { key, role: card.kind, title: card.title, body: card.body };
      }),
    );
    await prisma.campaignPost.update({ where: { id: postId }, data: { slides: slides as object[], caption: copy.caption, mediaStatus: 'ready', mediaError: null } });
    await prisma.postSlot.updateMany({ where: { campaignPostId: postId, captionOverride: null }, data: { captionOverride: copy.caption } });
  } catch (err) {
    console.error(`[playbook] tip carousel ${postId} failed:`, err);
    await fail(postId, err instanceof Error ? err.message : String(err));
  }
};
