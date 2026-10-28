/** POST /api/admin/script-generator/carousel/generate — { template, answers, listCount?, pronoun?, hook?, model } → { carousel } */
import type { NextRequest } from 'next/server';
import { adminRoute, json } from '../../../../../../src/server/admin/route';
import { generateCarousel, parseCarouselInput } from '../../../../../../src/server/scriptGenerator/carouselService';
import { parseModel } from '../../../../../../src/server/scriptGenerator/service';

export const maxDuration = 180;

export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  return json({ carousel: await generateCarousel(parseCarouselInput(body), parseModel(body.model)) });
});
