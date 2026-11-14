import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../src/server/api';
import { listAddableSlideshows } from '../../../../../src/server/calendar/slideshowPicks';
import { getPresignedUrl } from '../../../../../src/lib/r2';
import type { PlaybookSlide } from '../../../../../src/types/business/campaigns';
import { requireWorkspace } from '../../../../../src/server/workspaces/workspaces';

const SIGN_SECONDS = 3600;

/** GET /api/app/calendar/slideshows — every ready slideshow, newest first; planned ones carry their day. */
export const GET = authedRoute(async (_req, session) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  const rows = await listAddableSlideshows(ws.id);
  const slideshows = await Promise.all(
    rows.map(async (r) => {
      const slides = (Array.isArray(r.slides) ? r.slides : []) as PlaybookSlide[];
      const planned = r.slots.find((s) => s.status === 'planned');
      return {
        id: r.id,
        posted: r.slots.some((s) => s.status === 'posted'),
        plannedFor: planned ? planned.scheduledFor.toISOString().slice(0, 10) : null,
        idea: r.idea, slideCount: slides.length, coverUrl: slides[0] ? await getPresignedUrl(slides[0].key, SIGN_SECONDS) : null,
      };
    }),
  );
  return NextResponse.json({ slideshows });
});
