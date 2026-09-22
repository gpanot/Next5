import { NextResponse, type NextRequest } from 'next/server';
import {
  UGC_CONFIRM_ABOVE_USD, UGC_RESOLUTION,
  estimateVideoUsd, isUgcDuration, isUgcResolution, isUgcVideoModel,
  type UgcResolution, type UgcVideoModel,
} from '../../../../../src/config/ugcLab';
import { adminRoute } from '../../../../../src/server/admin/route';
import { toVideoDto } from '../../../../../src/server/admin/ugcStore';
import { submitVideo } from '../../../../../src/server/admin/ugcVideos';

type GenerateBody = {
  characterId?: string;
  script?: string;
  duration?: number;
  confirmOverBudget?: boolean;
  /** Optional R2 key for a custom voice sample. Wan 3.0 passes it as audio reference; Seedance ignores it for now. */
  voiceKey?: string;
  /** User-edited video generation prompt. Overrides the server-built prompt when provided. */
  customPrompt?: string;
  /** 'seedance' | 'wan3' — defaults to 'seedance'. */
  videoModel?: string;
  /** '480p' | '720p' — defaults to '480p'. */
  resolution?: string;
};

/**
 * POST { characterId, script, duration, confirmOverBudget?, voiceKey?, customPrompt?, videoModel?, resolution? } → { video }.
 * Photo and avatar characters are sent as the first frame.
 * videoModel='wan3' uses direct reAPI (REAPI_API_KEY); videoModel='seedance' (default) uses Treg.
 * resolution applies to both models; aspect ratio is always 9:16.
 */
export const POST = adminRoute(async (req: NextRequest) => {
  const {
    characterId, script, duration = 8, confirmOverBudget = false,
    voiceKey, customPrompt, videoModel: rawModel, resolution: rawRes,
  } = (await req.json()) as GenerateBody;

  if (!characterId) {
    return NextResponse.json({ error: 'Pick a character first' }, { status: 400 });
  }
  if (!script?.trim()) {
    return NextResponse.json({ error: 'script is required' }, { status: 400 });
  }
  if (!isUgcDuration(duration)) {
    return NextResponse.json({ error: 'duration must be 8, 16 or 24 seconds' }, { status: 400 });
  }

  const videoModel: UgcVideoModel = isUgcVideoModel(rawModel) ? rawModel : 'seedance';
  const resolution: UgcResolution = isUgcResolution(rawRes) ? rawRes : UGC_RESOLUTION;

  const estimated_cost_usd = estimateVideoUsd(videoModel, resolution, duration);
  if (estimated_cost_usd > UGC_CONFIRM_ABOVE_USD && !confirmOverBudget) {
    return NextResponse.json({ error: 'budget_exceeded', estimated_cost_usd, cap_usd: UGC_CONFIRM_ABOVE_USD }, { status: 402 });
  }

  const video = await submitVideo(
    characterId, script.trim(), duration,
    customPrompt?.trim() || undefined,
    videoModel, resolution,
    voiceKey || undefined,
  );
  return NextResponse.json({ video: await toVideoDto(video) }, { status: 201 });
});
