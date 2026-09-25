import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../src/server/admin/route';
import { REMIX_LAYERS, remixBlitz, type RemixLayer } from '../../../../../src/server/labs/blitzRemix';

type RemixBody = {
  locked?: unknown;
  captionText?: string;
  overlayKey?: string;
  backgroundKey?: string;
  audioKey?: string;
  businessText?: string;
  hint?: string;
};

const isLayer = (v: unknown): v is RemixLayer => REMIX_LAYERS.includes(v as RemixLayer);

/** Accepts one layer or a list; dedupes. Null when invalid. */
const parseLocked = (v: unknown): RemixLayer[] | null => {
  const list = Array.isArray(v) ? v : [v];
  if (list.length === 0 || !list.every(isLayer)) return null;
  return [...new Set(list)];
};

/**
 * POST /api/admin/blitz/remix
 * Body: { locked: RemixLayer[], captionText, overlayKey, backgroundKey, audioKey?, businessText?, hint? }
 * Returns: { captionText, overlayKey, backgroundKey, audioKey, reason, locked, usedVectors }
 *
 * "Remix it!" in the Blitz Lab: keeps the locked layers and asks Gemini 3.5 Flash Lite
 * (OpenRouter) for a new, more engaging combination of the other layers. Preview only —
 * nothing is rendered or saved.
 */
export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as RemixBody;
  const locked = parseLocked(body.locked);
  if (!locked) {
    return NextResponse.json({ error: `locked must list layers from ${REMIX_LAYERS.join(', ')}` }, { status: 400 });
  }
  if (locked.length === REMIX_LAYERS.length) {
    return NextResponse.json({ error: 'Unlock at least one layer' }, { status: 400 });
  }
  if (!body.overlayKey || !body.backgroundKey) {
    return NextResponse.json({ error: 'Pick a background and a meme video first' }, { status: 400 });
  }
  if ([body.overlayKey, body.backgroundKey, body.audioKey].some((k) => k?.startsWith('local:'))) {
    return NextResponse.json({ error: 'Wait for uploads to finish' }, { status: 400 });
  }

  const result = await remixBlitz({
    locked,
    captionText: body.captionText?.trim() ?? '',
    overlayKey: body.overlayKey,
    backgroundKey: body.backgroundKey,
    audioKey: body.audioKey || undefined,
    businessText: body.businessText?.trim() || undefined,
    hint: body.hint,
  });
  if (!result) return NextResponse.json({ error: 'Remix failed — try again' }, { status: 502 });
  return NextResponse.json(result);
});
