import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../src/server/api';
import { listAddableSlideshows } from '../../../../../src/server/calendar/slideshowPicks';
import { getPresignedUrl } from '../../../../../src/lib/r2';
import type { PlaybookSlide } from '../../../../../src/types/business/campaigns';
import { requireWorkspace } from '../../../../../src/server/workspaces/workspaces';

const SIGN_SECONDS = 3600;

/** GET /api/app/calendar/slideshows — slideshows she can still add to a day, newest first. */
export const GET = authedRoute(async (_req, session) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  const rows = await listAddableSlideshows(ws.id);
  const slideshows = await Promise.all(
    rows.map(async (r) => {
      const slides = (Array.isArray(r.slides) ? r.slides : []) as PlaybookSlide[];
      return { id: r.id, idea: r.idea, slideCount: slides.length, coverUrl: slides[0] ? await getPresignedUrl(slides[0].key, SIGN_SECONDS) : null };
    }),
  );
  return NextResponse.json({ slideshows });
});
