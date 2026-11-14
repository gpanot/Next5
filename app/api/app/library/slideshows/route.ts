import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../src/server/api';
import { prisma } from '../../../../../src/lib/db';
import { getPresignedUrl } from '../../../../../src/lib/r2';
import { beatOf } from '../../../../../src/lib/realtorPlaybooks';
import type { PlaybookSlide } from '../../../../../src/types/business/campaigns';
import { requireWorkspace } from '../../../../../src/server/workspaces/workspaces';

const SIGN_SECONDS = 3600;
const MAX_SHOWS = 60;

/** GET /api/app/library/slideshows — every slideshow Autopilot made for her, newest first. */
export const GET = authedRoute(async (_req, session) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  const rows = await prisma.campaignPost.findMany({
    where: { campaign: { workspaceId: ws.id }, format: 'slideshow', mediaStatus: 'ready', skipped: false },
    orderBy: [{ scheduledFor: 'desc' }, { id: 'desc' }],
    take: MAX_SHOWS,
    select: { id: true, beatKey: true, idea: true, caption: true, scheduledFor: true, slides: true },
  });
  const slideshows = await Promise.all(
    rows.map(async (r) => {
      const slides = (Array.isArray(r.slides) ? r.slides : []) as PlaybookSlide[];
      const slideUrls = (await Promise.all(slides.map((s) => getPresignedUrl(s.key, SIGN_SECONDS)))).filter((u): u is string => Boolean(u));
      return { id: r.id, title: beatOf(r.beatKey)?.label ?? r.idea ?? 'Slideshow', caption: r.caption, date: r.scheduledFor.toISOString().slice(0, 10), slideUrls };
    }),
  );
  return NextResponse.json({ slideshows: slideshows.filter((s) => s.slideUrls.length > 0) });
});
