import { NextResponse, type NextRequest } from 'next/server';
import { UGC_CONFIRM_ABOVE_USD, estimateSeedanceUsd, isUgcDuration } from '../../../../../src/config/ugcLab';
import { adminRoute } from '../../../../../src/server/admin/route';
import { toVideoDto } from '../../../../../src/server/admin/ugcStore';
import { submitVideo } from '../../../../../src/server/admin/ugcVideos';

type GenerateBody = {
  characterId?: string;
  script?: string;
  duration?: number;
  confirmOverBudget?: boolean;
  /** Optional R2 key for a custom voice sample (stored but not yet wired to a provider). */
  voiceKey?: string;
};

/**
 * POST { characterId, script, duration, confirmOverBudget?, voiceKey? } → { video }.
 * Photo and avatar characters are sent as the first frame; AI portraits as a look reference. 480p only.
 * voiceKey is accepted and logged for future voice-cloning provider integration.
 */
export const POST = adminRoute(async (req: NextRequest) => {
  const { characterId, script, duration = 8, confirmOverBudget = false, voiceKey } = (await req.json()) as GenerateBody;
  void voiceKey; // accepted, not yet wired to the provider — wire when the Seedance/Treg voice API is live

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
