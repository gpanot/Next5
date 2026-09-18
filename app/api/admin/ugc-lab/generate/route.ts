import { NextResponse, type NextRequest } from 'next/server';
import { UGC_CONFIRM_ABOVE_USD, estimateSeedanceUsd, isUgcDuration } from '../../../../../src/config/ugcLab';
import { adminRoute } from '../../../../../src/server/admin/route';
import { toVideoDto } from '../../../../../src/server/admin/ugcStore';
import { submitVideo } from '../../../../../src/server/admin/ugcVideos';

type GenerateBody = { characterId?: string; script?: string; duration?: number; confirmOverBudget?: boolean };

/**
 * POST { characterId, script, duration, confirmOverBudget? } → { video }.
 * Photo characters are sent as the first frame; AI portraits as a look reference. 480p only.
 */
export const POST = adminRoute(async (req: NextRequest) => {
  const { characterId, script, duration = 8, confirmOverBudget = false } = (await req.json()) as GenerateBody;

  if (!characterId) {
    return NextResponse.json({ error: 'Pick a character first' }, { status: 400 });
  }
  if (!script?.trim()) {
    return NextResponse.json({ error: 'script is required' }, { status: 400 });
  }
  if (!isUgcDuration(duration)) {
    return NextResponse.json({ error: 'duration must be 8, 16 or 24 seconds' }, { status: 400 });
  }

  const estimated_cost_usd = estimateSeedanceUsd(duration);
  if (estimated_cost_usd > UGC_CONFIRM_ABOVE_USD && !confirmOverBudget) {
    return NextResponse.json({ error: 'budget_exceeded', estimated_cost_usd, cap_usd: UGC_CONFIRM_ABOVE_USD }, { status: 402 });
  }

  const video = await submitVideo(characterId, script.trim(), duration);
  return NextResponse.json({ video: await toVideoDto(video) }, { status: 201 });
});
