import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../src/server/api';
import { prisma } from '../../../../../src/lib/db';
import { getPresignedUrl } from '../../../../../src/lib/r2';
import { beatOf } from '../../../../../src/lib/realtorPlaybooks';
import type { PlaybookSlide } from '../../../../../src/types/business/campaigns';
import { HOME_SLIDESHOW_INFO, isHomeSlideshowKind } from '../../../../../src/types/business/listingSlideshows';
import { requireWorkspace } from '../../../../../src/server/workspaces/workspaces';

const SIGN_SECONDS = 3600;
const MAX_SHOWS = 60;

/** GET /api/app/library/slideshows — every slideshow Autopilot and her listing pages made, newest first. */
export const GET = authedRoute(async (_req, session) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  const rows = await prisma.campaignPost.findMany({
    where: { campaign: { workspaceId: ws.id }, format: 'slideshow', mediaStatus: 'ready', skipped: false },
    orderBy: [{ scheduledFor: 'desc' }, { id: 'desc' }],
    take: MAX_SHOWS,
    select: { id: true, beatKey: true, idea: true, caption: true, scheduledFor: true, slides: true },
  });
  const homeRows = await prisma.listingSlideshow.findMany({
    where: { workspaceId: ws.id, status: 'ready' },
    orderBy: { createdAt: 'desc' },
    take: MAX_SHOWS,
    select: { id: true, kind: true, caption: true, createdAt: true, slides: true, listing: { select: { label: true } } },
  });
  const homeShows = await Promise.all(
    homeRows.map(async (r) => {
      const slides = (Array.isArray(r.slides) ? r.slides : []) as PlaybookSlide[];
      const slideUrls = (await Promise.all(slides.map((s) => getPresignedUrl(s.key, SIGN_SECONDS)))).filter((u): u is string => Boolean(u));
      const name = isHomeSlideshowKind(r.kind) ? HOME_SLIDESHOW_INFO[r.kind].name : 'Slideshow';
      return { id: r.id, title: `${name} · ${r.listing.label}`, caption: r.caption, date: r.createdAt.toISOString().slice(0, 10), slideUrls };
    }),
  );
  const autopilotShows = await Promise.all(
    rows.map(async (r) => {
      const slides = (Array.isArray(r.slides) ? r.slides : []) as PlaybookSlide[];
      const slideUrls = (await Promise.all(slides.map((s) => getPresignedUrl(s.key, SIGN_SECONDS)))).filter((u): u is string => Boolean(u));
      return { id: r.id, title: beatOf(r.beatKey)?.label ?? r.idea ?? 'Slideshow', caption: r.caption, date: r.scheduledFor.toISOString().slice(0, 10), slideUrls };
    }),
  );
  const slideshows = [...homeShows, ...autopilotShows]
    .filter((s) => s.slideUrls.length > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, MAX_SHOWS);
  return NextResponse.json({ slideshows });
});
