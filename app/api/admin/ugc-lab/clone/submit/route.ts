import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../../src/server/admin/route';
import { tregCall } from '../../../../../../src/server/admin/ugcLab';
import { createCloneJob } from '../../../../../../src/server/admin/cloneVideos';

export const maxDuration = 30;

// --------------------------------------------------------------------------
// Seedance 2.5 face model via reapi — video editing mode
//
// We pass `video_urls` so reapi can reference @video1 in the prompt.
// This is video-editing mode → reapi requires duration: -1 (output matches input length).
// Treg cost: charged based on actual video length by reapi.
// --------------------------------------------------------------------------
const SEEDANCE_ENDPOINT = 'reapi.video-gen.seedance-2-5.unrestricted';
const SEEDANCE_MODEL    = 'doubao-seedance-2.5-face';

/** Prompt — image + video only */
const PROMPT_BASE =
  'Keep the entire original video from @video1, including all animations, background, motion and audio. ' +
  'Only replace the face in the video with the face of the character from @image1. ' +
  'Preserve all movements, expressions, timing, and background exactly.';

/** Prompt — image + video + audio reference */
const PROMPT_WITH_AUDIO =
  'Keep the entire original video from @video1, including all animations, background, motion and audio. ' +
  'Only replace the face in the video with the face of the character from @image1. ' +
  'Preserve all movements, expressions, timing, and background exactly. ' +
  'Use the audio as a reference.';

type SubmitBody = {
  /** Vendor URL for the character face image */
  imageVendorUrl?: string;
  /** Vendor URL for the reference video (passed as video_urls → @video1) */
  videoVendorUrl?: string;
  /** Vendor URL for an optional voice/audio reference */
  voiceVendorUrl?: string;
  /** R2 keys — stored in the DB so the library can re-sign them */
  characterKey?: string;
  refVideoKey?: string;
  durationSec?: number;
};

/**
 * POST { imageVendorUrl, videoVendorUrl, voiceVendorUrl?, characterKey, refVideoKey, durationSec }
 * → submits to reapi Seedance 2.5 face in video-editing mode
 * → returns { taskId }
 */
export const POST = adminRoute(async (req: NextRequest) => {
  const {
    imageVendorUrl,
    videoVendorUrl,
    voiceVendorUrl,
    characterKey,
    refVideoKey,
    durationSec = 5,
  } = (await req.json()) as SubmitBody;

  if (!imageVendorUrl?.trim()) {
    return NextResponse.json(
      { error: 'imageVendorUrl is required — upload a character image first' },
      { status: 400 },
    );
  }
  if (!videoVendorUrl?.trim()) {
    return NextResponse.json(
      { error: 'videoVendorUrl is required — upload a reference video first' },
      { status: 400 },
    );
  }

  const hasAudio = Boolean(voiceVendorUrl?.trim());
  const prompt   = hasAudio ? PROMPT_WITH_AUDIO : PROMPT_BASE;

  // Video editing mode:
  //  - image_urls: character face (@image1)
  //  - video_urls: reference video (@video1)
  //  - duration: -1 (required — output inherits input video duration)
  const seedanceBody: Record<string, unknown> = {
    model:          SEEDANCE_MODEL,
    content_filter: false,
    prompt,
    duration:       -1,  // video editing mode requires -1
    generate_audio: true,
    image_urls:     [imageVendorUrl],
    video_urls:     [videoVendorUrl],
  };

  if (hasAudio) {
    seedanceBody.audio_urls = [voiceVendorUrl];
  }

  // ------------------------------------------------------------------
  // Submit to reapi via Treg
  // ------------------------------------------------------------------
  let taskId: string;
  try {
    const result = await tregCall<{ id?: string; task_id?: string }>(
      SEEDANCE_ENDPOINT,
      { method: 'POST', body: seedanceBody, timeoutMs: 30_000 },
    );
    taskId = result.id ?? result.task_id ?? '';
    if (!taskId) throw new Error('No task ID returned from reapi');
  } catch (err) {
    console.error('[clone/submit] reapi error:', err);
    return NextResponse.json(
      { error: (err as Error).message ?? 'Failed to submit to Seedance' },
      { status: 502 },
    );
  }

  // Persist to the library DB so the video is mirrored to R2 when it finishes
  if (characterKey && refVideoKey) {
    try {
      await createCloneJob({
        poyoTaskId: taskId,
        characterKey,
        refVideoKey,
        durationSec,
      });
    } catch (err) {
      console.error('[clone/submit] failed to persist job to DB:', err);
    }
  }

  return NextResponse.json({ taskId }, { status: 201 });
});
