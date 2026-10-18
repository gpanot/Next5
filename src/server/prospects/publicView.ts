// server-only — never import from a 'use client' file.
// The public review page's data (/p/<token>): only the pack's 14 posts, as signed links that expire. Nothing else of
// the workspace is shown, and a pack that is not ready answers like a missing one.

import { prisma } from '../../lib/db';
import { getPresignedUrl } from '../../lib/r2';
import type { AutoSlide } from '../../types/admin/autoSlideshow';
import { GOAL_LABELS, type ContentGoal } from '../../types/admin/contentGoals';
import { PROSPECT_HOLD_DAYS, type ProspectBlitz, type ProspectDay, type ProspectKind, type ProspectViewDay, type ProspectViewDto, type ProspectWhy } from '../../types/admin/prospects';
import type { DeckItem } from '../slideshow/core/deckAssembly';
import { HttpError } from '../http';

/** Links last long enough for a long look; the page reads fresh ones on each open. */
const LINK_S = 6 * 3600;

const signed = async (key: string | null | undefined): Promise<string | null> => (key ? getPresignedUrl(key, LINK_S) : null);

/** The Blitz card's own "Why this?" (deckAssembly whyPanel), from the idea the video was made from. */
const blitzWhy = async (ideaId: string | undefined): Promise<ProspectWhy | null> => {
  if (!ideaId) return null;
  const row = await prisma.slideshowVariant.findUnique({ where: { id: ideaId }, select: { plan: true } });
  const why = ((row?.plan as { card?: DeckItem } | null)?.card)?.whyPanel;
  if (!why) return null;
  return { audience: why.audience, hook: why.hookStyle, hookReason: why.hookStyleReason, story: why.storyLines, proof: why.proofNote };
};

const HOOK_REASON: Record<Exclude<ProspectKind, 'blitz'>, string> = {
  cast: 'Told by one of your brand faces, so people see the same person each time and start to trust them.',
  hooks: 'One of 4 first lines on the same slides. Posting them on different days shows which line stops people most.',
};

/** A slideshow's "Why this?": its goal, its first line and why that kind, and what each slide says. */
const slideshowWhy = (kind: Exclude<ProspectKind, 'blitz'>, goal: string | null, slides: AutoSlide[]): ProspectWhy => ({
  audience: goal && goal in GOAL_LABELS ? `${GOAL_LABELS[goal as ContentGoal]} post` : 'Photo slideshow',
  hook: kind === 'cast' ? 'Brand Cast slideshow' : 'Hooks Volume slideshow',
  hookReason: HOOK_REASON[kind],
  story: slides.slice(1).map((sl, i) => ({ label: sl.role === 'cta' ? 'Last slide' : `Slide ${i + 2}`, text: sl.title })),
  proof: '',
});

const blitzDay = async (day: ProspectDay, ideaId: string | undefined): Promise<ProspectViewDay | null> => {
  const project = await prisma.blitzProject.findUnique({ where: { id: day.refId }, select: { renderedVideoKey: true, captionText: true, currentAssets: true } });
  if (!project?.renderedVideoKey) return null;
  const seconds = Number((project.currentAssets as { durationSeconds?: unknown } | null)?.durationSeconds);
  const durationSec = Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : null;
  return { day: day.day, at: day.at, kind: 'blitz', title: project.captionText, videoUrl: await signed(project.renderedVideoKey), slides: [], durationSec, caption: project.captionText, why: await blitzWhy(ideaId) };
};

const slideshowDay = async (day: ProspectDay): Promise<ProspectViewDay | null> => {
  const show = await prisma.autoSlideshow.findUnique({ where: { id: day.refId }, select: { slides: true, caption: true, status: true, goal: true } });
  if (!show || show.status !== 'ready') return null;
  const slides = (show.slides as unknown as AutoSlide[]) ?? [];
  const urls = (await Promise.all(slides.map((s) => signed(s.imageKey)))).filter((u): u is string => !!u);
  return { day: day.day, at: day.at, kind: day.kind, title: slides[0]?.title ?? '', videoUrl: null, slides: urls, durationSec: null, caption: show.caption ?? '', why: day.kind === 'blitz' ? null : slideshowWhy(day.kind, show.goal, slides) };
};

export const prospectView = async (token: string): Promise<ProspectViewDto> => {
  const pack = await prisma.prospectPack.findUnique({ where: { shareToken: token }, select: { name: true, websiteUrl: true, status: true, days: true, blitz: true, createdAt: true } });
  if (!pack || (pack.status !== 'ready' && pack.status !== 'claimed')) throw new HttpError(404, 'not_found', 'This link does not work.');
  const stored = (pack.days as unknown as ProspectDay[]) ?? [];
  const ideaOf = new Map(((pack.blitz as unknown as ProspectBlitz[]) ?? []).map((b) => [b.projectId, b.ideaId]));
  const days = await Promise.all(stored.map((d) => (d.kind === 'blitz' ? blitzDay(d, ideaOf.get(d.refId)) : slideshowDay(d)).catch(() => null)));
  const heldUntil = new Date(pack.createdAt.getTime() + PROSPECT_HOLD_DAYS * 86_400_000).toISOString();
  return { name: pack.name, websiteUrl: pack.websiteUrl, status: pack.status, heldUntil, heldEnded: Date.parse(heldUntil) < Date.now(), days: days.filter((d): d is ProspectViewDay => d !== null) };
};
