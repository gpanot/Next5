import { NextResponse, type NextRequest } from 'next/server';
import { labRoute } from '../../../../../src/server/labs/labAccess';
import { previewVoiceover } from '../../../../../src/server/labs/blitzVoicePreview';

/** Writing and recording a voiceover takes ~10-30 s. */
export const maxDuration = 120;

/**
 * POST /api/admin/blitz/voice-preview { texts: string[], voice } → { url, durations, lines }: a Blitz card's voiceover
 * for the Ideas deck, the same recording its render will use. 429 when a free workspace used its previews for the day.
 */
export const POST = labRoute(async (req: NextRequest, _ctx: unknown, access) => {
  const body = (await req.json().catch(() => ({}))) as { texts?: unknown; voice?: string };
  return NextResponse.json(await previewVoiceover(access, body.texts, body.voice));
});
