/** POST /api/admin/script-generator/carousel/refine — { input, carousel, instruction, model } → { refused, message, carousel } */
import type { NextRequest } from 'next/server';
import { adminRoute, json } from '../../../../../../src/server/admin/route';
import { normalizeCarousel, parseCarouselInput, refineCarousel } from '../../../../../../src/server/scriptGenerator/carouselService';
import { parseModel } from '../../../../../../src/server/scriptGenerator/service';

export const maxDuration = 180;

export const POST = adminRoute(async (req: NextRequest) => {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const input = parseCarouselInput((body.input ?? {}) as Record<string, unknown>);
  const carousel = normalizeCarousel(body.carousel, input, false);
  return json(await refineCarousel(input, carousel, body.instruction, parseModel(body.model)));
});
