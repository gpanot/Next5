import { NextResponse } from 'next/server';
import { blitzVoiceOptions } from '../../../../../src/server/labs/blitzVoice';
import { labRoute } from '../../../../../src/server/labs/labAccess';

/** The first call records each voice's sample (a few seconds each, side by side); later calls only read them. */
export const maxDuration = 60;

/** GET /api/admin/blitz/voices → { voices }: the narrator voices a Blitz card can take, each with a sample line. */
export const GET = labRoute(async () => NextResponse.json({ voices: await blitzVoiceOptions() }));
