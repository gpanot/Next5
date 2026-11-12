// server-only — never import from a 'use client' file.
// Makes one Market update post: this week's sourced stats → hook + one card per stat + CTA → R2 → the post row.

import { prisma } from '../../lib/db';
import { uploadToR2 } from '../../lib/r2';
import { parseMarketArea, type MarketArea } from '../../lib/marketArea';
import type { PlaybookSlide } from '../../types/business/campaigns';
import { getMarketSnapshot } from '../realtor/marketResearch';
import { shortSource, type MarketStat } from '../realtor/marketStats';
import { renderCard, type Card } from './statCards';

const MAX_CARDS = 4;
const slideKey = (postId: string, i: number) => `campaign-posts/${postId}/slide-${i + 1}.jpg`;

const weekLabel = (date: Date) => `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`;

/** Weekly-moving stats first (what changed), then the monthly ones, max 4 cards. */
const pick = (stats: MarketStat[]): MarketStat[] =>
  [...stats.filter((s) => s.cadence === 'weekly').slice(0, 2), ...stats.filter((s) => s.cadence === 'monthly')].slice(0, MAX_CARDS);

const captionOf = (area: MarketArea, stats: MarketStat[], sources: string): string => {
  const city = area.city.replace(/\s+/g, '');
  const lines = stats.slice(0, 3).map((s) => `• ${s.name}: ${s.value}${s.change ? ` (${s.change})` : ''}`);
  return [`${area.city} housing market, this week:`, ...lines, '', 'Thinking of selling? DM VALUE for what your home is worth now.', sources, `#${city}RealEstate #${city}Homes #HousingMarket #RealEstate`].join('\n');
};

const asOfLabel = (stats: MarketStat[]) => {
  const latest = stats.map((s) => s.asOf).sort().at(-1);
  return latest ? new Date(`${latest}T00:00:00.000Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '';
};

export const cardsFor = (area: MarketArea, stats: MarketStat[], postDate: Date): { cards: Card[]; caption: string } => {
  const chosen = pick(stats);
  const sources = `Sources: ${[...new Set(chosen.map((s) => shortSource(s.sourceName)))].join(', ')} · data as of ${asOfLabel(chosen)}`;
  const cards: Card[] = [
    { kind: 'hook', city: area.city, weekLabel: weekLabel(postDate), count: chosen.length },
    ...chosen.map((stat, i): Card => ({ kind: 'stat', stat, index: i + 1, total: chosen.length })),
    { kind: 'cta', title: 'What is your home worth now?', body: 'Prices move every week. I will send you a free, real number for your home.', sources },
  ];
  return { cards, caption: captionOf(area, chosen, sources) };
};

const fail = (postId: string, message: string) =>
  prisma.campaignPost.update({ where: { id: postId }, data: { mediaStatus: 'failed', mediaError: message.slice(0, 500) } });

/** Renders and stores one market update post. Never throws: a failure is written on the row. */
export const makeMarketUpdate = async (postId: string, workspaceId: string): Promise<void> => {
  try {
    const [post, ws] = await Promise.all([
      prisma.campaignPost.findUniqueOrThrow({ where: { id: postId }, select: { scheduledFor: true } }),
      prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { marketArea: true } }),
    ]);
    const area = parseMarketArea(ws.marketArea);
    if (!area) return void (await fail(postId, 'Add where you sell first.'));
    const snapshot = await getMarketSnapshot(area);
    if (!snapshot.publishable) return void (await fail(postId, 'Not enough sourced numbers for your area this week. Try again later.'));

    const { cards, caption } = cardsFor(area, snapshot.stats, post.scheduledFor);
    const slides: PlaybookSlide[] = await Promise.all(
      cards.map(async (card, i) => {
        const key = slideKey(postId, i);
        await uploadToR2(key, await renderCard(card), 'image/jpeg');
        const title = card.kind === 'hook' ? `${card.city} housing market` : card.kind === 'stat' ? card.stat.name : card.title;
        const body = card.kind === 'stat' ? `${card.stat.value} · ${card.stat.meaning}` : card.kind === 'cta' ? card.body : card.weekLabel;
        return { key, role: card.kind === 'stat' ? 'item' : card.kind, title, body };
      }),
    );
    await prisma.campaignPost.update({ where: { id: postId }, data: { slides: slides as object[], caption, mediaStatus: 'ready', mediaError: null } });
    await prisma.postSlot.updateMany({ where: { campaignPostId: postId, captionOverride: null }, data: { captionOverride: caption } });
  } catch (err) {
    console.error(`[playbook] market update ${postId} failed:`, err);
    await fail(postId, err instanceof Error ? err.message : String(err));
  }
};
