/** POST /api/admin/script-generator/voice — { text } → audio/wav, the script read aloud by a man (cost in the x-cost-usd header) */
import type { NextRequest } from 'next/server';
import { adminRoute } from '../../../../../src/server/admin/route';
import { parseVoiceText, readAloud } from '../../../../../src/server/scriptGenerator/voice';

export const maxDuration = 120;

export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as { text?: unknown };
  const { wav, durationS, costUsd } = await readAloud(parseVoiceText(body.text));
  return new Response(new Uint8Array(wav), {
    headers: { 'content-type': 'audio/wav', 'x-duration-s': durationS.toFixed(1), 'x-cost-usd': costUsd.toFixed(4), 'cache-control': 'no-store' },
  });
});
