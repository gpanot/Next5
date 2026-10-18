// server-only — never import from a 'use client' file.
// The public review page's data (/p/<token>): only the pack's 14 posts, as signed links that expire. Nothing else of
// the workspace is shown, and a pack that is not ready answers like a missing one.

import { prisma } from '../../lib/db';
import { getPresignedUrl } from '../../lib/r2';
import type { AutoSlide } from '../../types/admin/autoSlideshow';
import { PROSPECT_HOLD_DAYS, type ProspectDay, type ProspectViewDay, type ProspectViewDto } from '../../types/admin/prospects';
import { HttpError } from '../http';

/** Links last long enough for a long look; the page reads fresh ones on each open. */
const LINK_S = 6 * 3600;

const signed = async (key: string | null | undefined): Promise<string | null> => (key ? getPresignedUrl(key, LINK_S) : null);

const blitzDay = async (day: ProspectDay): Promise<ProspectViewDay | null> => {
  const project = await prisma.blitzProject.findUnique({ where: { id: day.refId }, select: { renderedVideoKey: true, captionText: true, currentAssets: true } });
  if (!project?.renderedVideoKey) return null;
  const seconds = Number((project.currentAssets as { durationSeconds?: unknown } | null)?.durationSeconds);
  const durationSec = Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : null;
  return { day: day.day, at: day.at, kind: 'blitz', title: project.captionText, videoUrl: await signed(project.renderedVideoKey), slides: [], durationSec, caption: project.captionText };
};

const slideshowDay = async (day: ProspectDay): Promise<ProspectViewDay | null> => {
  const show = await prisma.autoSlideshow.findUnique({ where: { id: day.refId }, select: { slides: true, caption: true, status: true } });
  if (!show || show.status !== 'ready') return null;
  const slides = (show.slides as unknown as AutoSlide[]) ?? [];
  const urls = (await Promise.all(slides.map((s) => signed(s.imageKey)))).filter((u): u is string => !!u);
  return { day: day.day, at: day.at, kind: day.kind, title: slides[0]?.title ?? '', videoUrl: null, slides: urls, durationSec: null, caption: show.caption ?? '' };
};

export const prospectView = async (token: string): Promise<ProspectViewDto> => {
  const pack = await prisma.prospectPack.findUnique({ where: { shareToken: token }, select: { name: true, websiteUrl: true, status: true, days: true, createdAt: true } });
  if (!pack || (pack.status !== 'ready' && pack.status !== 'claimed')) throw new HttpError(404, 'not_found', 'This link does not work.');
  const stored = (pack.days as unknown as ProspectDay[]) ?? [];
  const days = await Promise.all(stored.map((d) => (d.kind === 'blitz' ? blitzDay(d) : slideshowDay(d)).catch(() => null)));
  const heldUntil = new Date(pack.createdAt.getTime() + PROSPECT_HOLD_DAYS * 86_400_000).toISOString();
  return { name: pack.name, websiteUrl: pack.websiteUrl, status: pack.status, heldUntil, heldEnded: Date.parse(heldUntil) < Date.now(), days: days.filter((d): d is ProspectViewDay => d !== null) };
};
