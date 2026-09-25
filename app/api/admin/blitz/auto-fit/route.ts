import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../src/server/admin/route';
import { autoFitBlitz, type Rect } from '../../../../../src/server/labs/blitzAutoFit';

/** Half-size JPEG frames are ~50–150 KB; anything far bigger is not from the editor. */
const MAX_IMAGE_CHARS = 3_000_000;

type AutoFitBody = {
  backgroundJpeg?: unknown;
  compositeJpeg?: unknown;
  captionText?: unknown;
  layout?: { subjectBase?: unknown; subjectNow?: unknown; caption?: unknown; business?: unknown };
};

const isJpeg = (v: unknown): v is string =>
  typeof v === 'string' && v.startsWith('data:image/jpeg;base64,') && v.length <= MAX_IMAGE_CHARS;

const isRect = (v: unknown): v is Rect => {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  return ['x', 'y', 'w', 'h'].every((k) => typeof r[k] === 'number' && Number.isFinite(r[k]));
};

/**
 * POST /api/admin/blitz/auto-fit
 * Body: { backgroundJpeg, compositeJpeg, captionText, layout: { subjectBase, subjectNow, caption, business } }
 * Returns: { overlayZoom, overlayOffsetX, overlayOffsetY, captionPositionY, captionOffsetX, reason }
 *
 * "Auto Fit" in the Blitz Lab: Gemini 3.5 Flash Lite (OpenRouter) looks at the first frame and
 * places the meme and caption so the frame looks neat. Preview only — nothing is saved.
 */
export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as AutoFitBody;
  const l = body.layout;
  if (!isJpeg(body.backgroundJpeg) || !isJpeg(body.compositeJpeg)) {
    return NextResponse.json({ error: 'Snapshot images missing or too large' }, { status: 400 });
  }
  if (!l || !isRect(l.subjectBase) || !isRect(l.subjectNow) || !isRect(l.caption) || (l.business != null && !isRect(l.business))) {
    return NextResponse.json({ error: 'Invalid layout' }, { status: 400 });
  }

  const result = await autoFitBlitz({
    backgroundJpeg: body.backgroundJpeg,
    compositeJpeg: body.compositeJpeg,
    captionText: typeof body.captionText === 'string' ? body.captionText.slice(0, 300) : '',
    layout: { subjectBase: l.subjectBase, subjectNow: l.subjectNow, caption: l.caption, business: isRect(l.business) ? l.business : null },
  });
  if (!result) return NextResponse.json({ error: 'Auto Fit failed — try again' }, { status: 502 });
  return NextResponse.json(result);
});
