import { NextResponse, type NextRequest } from 'next/server';
import { labRoute } from '../../../../../src/server/labs/labAccess';
import type { Rect } from '../../../../../src/server/labs/blitzAutoFit';
import { autoFitCaption } from '../../../../../src/server/labs/blitzCaptionFit';

/** Half-size JPEG frames are ~50–150 KB; anything far bigger is not from the editor. */
const MAX_IMAGE_CHARS = 3_000_000;

type Body = {
  backgroundJpeg?: unknown;
  compositeJpeg?: unknown;
  captionText?: unknown;
  layout?: { caption?: unknown; business?: unknown };
};

const isJpeg = (v: unknown): v is string =>
  typeof v === 'string' && v.startsWith('data:image/jpeg;base64,') && v.length <= MAX_IMAGE_CHARS;

const isRect = (v: unknown): v is Rect => {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  return ['x', 'y', 'w', 'h'].every((k) => typeof r[k] === 'number' && Number.isFinite(r[k]));
};

/**
 * POST /api/admin/blitz/auto-fit-caption
 * Body: { backgroundJpeg, compositeJpeg, captionText, layout: { caption, business } }
 * Returns: { captionPositionY, reason }
 *
 * "Auto Fit" in the Slideshow editor: the vision model looks at the slide's picture and places the caption off faces,
 * on a calm area. Preview only — nothing is saved.
 */
export const POST = labRoute(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as Body;
  const l = body.layout;
  if (!isJpeg(body.backgroundJpeg) || !isJpeg(body.compositeJpeg)) {
    return NextResponse.json({ error: 'Snapshot images missing or too large' }, { status: 400 });
  }
  if (!l || !isRect(l.caption) || (l.business != null && !isRect(l.business))) {
    return NextResponse.json({ error: 'Invalid layout' }, { status: 400 });
  }
  const result = await autoFitCaption({
    backgroundJpeg: body.backgroundJpeg,
    compositeJpeg: body.compositeJpeg,
    captionText: typeof body.captionText === 'string' ? body.captionText.slice(0, 300) : '',
    layout: { caption: l.caption, business: isRect(l.business) ? l.business : null },
  });
  if (!result) return NextResponse.json({ error: 'Auto Fit failed — try again' }, { status: 502 });
  return NextResponse.json({ captionPositionY: result.captionPositionY, reason: result.reason });
});
