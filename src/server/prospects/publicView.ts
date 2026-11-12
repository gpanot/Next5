// server-only — never import from a 'use client' file.
// The public review page's data (/p/<token>): only the pack's 14 posts, as signed links that expire. Nothing else of
// the workspace is shown, and a pack that is not ready answers like a missing one. Days after the free ones are locked:
// only their first slide (slideshows) or first shot (videos) is sent, with no caption or story.

import { prisma } from '../../lib/db';
import { getPresignedUrl } from '../../lib/r2';
import type { AutoSlide } from '../../types/admin/autoSlideshow';
import { GOAL_LABELS, type ContentGoal } from '../../types/admin/contentGoals';
import { formatTag, goalTag, PROSPECT_FREE_DAYS, PROSPECT_HOLD_DAYS, type ProspectBlitz, type ProspectDay, type ProspectKind, type ProspectViewDay, type ProspectViewDto, type ProspectWhy } from '../../types/admin/prospects';
import type { DeckItem } from '../slideshow/core/deckAssembly';
import { HttpError } from '../http';

/** Links last long enough for a long look; the page reads fresh ones on each open. */
const LINK_S = 6 * 3600;

const signed = async (key: string | null | undefined): Promise<string | null> => (key ? getPresignedUrl(key, LINK_S) : null);

/** The idea's deck card, which the video was made from. */
const ideaCard = async (ideaId: string | undefined): Promise<DeckItem | null> => {
  if (!ideaId) return null;
  const row = await prisma.slideshowVariant.findUnique({ where: { id: ideaId }, select: { plan: true } });
  return (row?.plan as { card?: DeckItem } | null)?.card ?? null;
};

/** The Blitz card's own "Why this?" (deckAssembly whyPanel). */
const blitzWhy = (card: DeckItem | null): ProspectWhy | null => {
  const why = card?.whyPanel;
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

/** A locked video: the first shot of its idea (photo or clip) under its hook line. */
const lockedBlitzDay = async (day: ProspectDay, ideaId: string | undefined): Promise<ProspectViewDay | null> => {
  const card = await ideaCard(ideaId);
  const shot = card?.shots[0];
  if (!shot) return null;
  const url = shot.assetKey ? await signed(shot.assetKey) : shot.mediaUrl || null;
  const clip = shot.mediaKind === 'video';
  return { day: day.day, at: day.at, kind: 'blitz', title: shot.text, videoUrl: clip ? url : null, slides: !clip && url ? [url] : [], durationSec: null, audioUrl: null, audioStart: 0, caption: '', why: null, locked: true, tag: formatTag(card.script?.format) };
};

const blitzDay = async (day: ProspectDay, ideaId: string | undefined): Promise<ProspectViewDay | null> => {
  const project = await prisma.blitzProject.findUnique({ where: { id: day.refId }, select: { renderedVideoKey: true, captionText: true, currentAssets: true } });
  if (!project?.renderedVideoKey) return null;
  const seconds = Number((project.currentAssets as { durationSeconds?: unknown } | null)?.durationSeconds);
  const durationSec = Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : null;
  const card = await ideaCard(ideaId);
  return { day: day.day, at: day.at, kind: 'blitz', title: project.captionText, videoUrl: await signed(project.renderedVideoKey), slides: [], durationSec, audioUrl: null, audioStart: 0, caption: project.captionText, why: blitzWhy(card), locked: false, tag: formatTag(card?.script?.format) };
};

/** A slideshow day with its music; a locked one keeps only its first slide (a preview has only that one rendered). */
const slideshowDay = async (day: ProspectDay, locked: boolean): Promise<ProspectViewDay | null> => {
  const show = await prisma.autoSlideshow.findUnique({
    where: { id: day.refId },
    select: { slides: true, caption: true, status: true, goal: true, audioStart: true, audio: { select: { r2Key: true } } },
  });
  if (!show || (show.status !== 'ready' && !day.preview)) return null;
  const slides = (show.slides as unknown as AutoSlide[]) ?? [];
  const urls = (await Promise.all((locked ? slides.slice(0, 1) : slides).map((s) => signed(s.imageKey)))).filter((u): u is string => !!u);
  if (urls.length === 0) return null;
  const why = locked || day.kind === 'blitz' ? null : slideshowWhy(day.kind, show.goal, slides);
  const audioUrl = locked ? null : await signed(show.audio?.r2Key);
  return { day: day.day, at: day.at, kind: day.kind, title: slides[0]?.title ?? '', videoUrl: null, slides: urls, durationSec: null, audioUrl, audioStart: show.audioStart, caption: locked ? '' : show.caption ?? '', why, locked, tag: goalTag(show.goal) ?? (day.kind === 'hooks' ? 'Tips' : null) };
};

const viewDay = (day: ProspectDay, ideaOf: Map<string | null, string>): Promise<ProspectViewDay | null> => {
  const locked = day.day > PROSPECT_FREE_DAYS || !!day.preview;
  if (day.kind !== 'blitz') return slideshowDay(day, locked);
  // A Blitz preview's refId is its idea; a rendered video's is its project.
  if (locked) return lockedBlitzDay(day, day.preview ? day.refId : ideaOf.get(day.refId));
  return blitzDay(day, ideaOf.get(day.refId));
};

export const prospectView = async (token: string): Promise<ProspectViewDto> => {
  const pack = await prisma.prospectPack.findUnique({ where: { shareToken: token }, select: { name: true, websiteUrl: true, status: true, days: true, blitz: true, createdAt: true } });
  if (!pack || (pack.status !== 'ready' && pack.status !== 'claimed')) throw new HttpError(404, 'not_found', 'This link does not work.');
  const stored = (pack.days as unknown as ProspectDay[]) ?? [];
  const ideaOf = new Map(((pack.blitz as unknown as ProspectBlitz[]) ?? []).map((b) => [b.projectId, b.ideaId]));
  const days = await Promise.all(stored.map((d) => viewDay(d, ideaOf).catch(() => null)));
  const heldUntil = new Date(pack.createdAt.getTime() + PROSPECT_HOLD_DAYS * 86_400_000).toISOString();
  return { name: pack.name, websiteUrl: pack.websiteUrl, status: pack.status, heldUntil, heldEnded: Date.parse(heldUntil) < Date.now(), days: days.filter((d): d is ProspectViewDay => d !== null) };
};
