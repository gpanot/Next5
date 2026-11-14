import { NextResponse } from 'next/server';
import { isSlideTheme } from '../../../../../../src/lib/slideThemes';
import { authedRoute } from '../../../../../../src/server/api';
import { HttpError, readJsonObject } from '../../../../../../src/server/http';
import { listListingSlideshows, startListingSlideshows } from '../../../../../../src/server/realtorSlides/listingSlideshows';
import { requireWorkspace } from '../../../../../../src/server/workspaces/workspaces';
import { isHomeSlideshowKind } from '../../../../../../src/types/business/listingSlideshows';

// Each slideshow (words + up to 8 slides) is made in after() and takes about 30-60 s.
export const maxDuration = 300;

type Ctx = { params: Promise<{ listingId: string }> };

/** GET — the latest slideshow of each kind for this listing. */
export const GET = authedRoute(async (_req, session, { params }: Ctx) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  const { listingId } = await params;
  return NextResponse.json({ slideshows: await listListingSlideshows(ws, listingId) });
});

/** POST { kinds: HomeSlideshowKind[], theme: SlideTheme } — make the picked slideshows in that theme. */
export const POST = authedRoute(async (req, session, { params }: Ctx) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  const { listingId } = await params;
  const body = await readJsonObject(req);
  const kinds = Array.isArray(body.kinds) ? [...new Set(body.kinds.filter(isHomeSlideshowKind))] : [];
  if (kinds.length === 0) throw new HttpError(400, 'invalid_kinds', 'Pick at least one slideshow.');
  if (!isSlideTheme(body.theme)) throw new HttpError(400, 'invalid_theme', 'Unknown slideshow theme.');
  await startListingSlideshows(ws, listingId, kinds, body.theme);
  return NextResponse.json({ slideshows: await listListingSlideshows(ws, listingId) });
});
