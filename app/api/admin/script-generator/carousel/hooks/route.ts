/** POST /api/admin/script-generator/carousel/hooks — { template, answers, listCount?, pronoun?, model } → { hooks: [3 slide 1 options] } */
import type { NextRequest } from 'next/server';
import { adminRoute, json } from '../../../../../../src/server/admin/route';
import { generateCarouselHooks, parseCarouselInput } from '../../../../../../src/server/scriptGenerator/carouselService';
import { parseModel } from '../../../../../../src/server/scriptGenerator/service';

export const maxDuration = 120;

export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  return json({ hooks: await generateCarouselHooks(parseCarouselInput(body), parseModel(body.model)) });
});
