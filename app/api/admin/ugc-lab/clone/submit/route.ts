import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../../src/server/admin/route';
import { tregCall } from '../../../../../../src/server/admin/ugcLab';
import { createCloneJob } from '../../../../../../src/server/admin/cloneVideos';

export const maxDuration = 30;

// --------------------------------------------------------------------------
// Seedance 2.5 face model via reapi
// Explicit duration from the dropdown — NEVER -1.
// video_urls is passed so the model sees the reference footage as context.
// The prompt must NOT contain @video1 to avoid reapi forcing duration: -1.
// --------------------------------------------------------------------------
const SEEDANCE_ENDPOINT = 'reapi.video-gen.seedance-2-5.unrestricted';
const SEEDANCE_MODEL    = 'doubao-seedance-2.5-face';

type SubmitBody = {
  /** Vendor URL for the character face image */
  imageVendorUrl?: string;
  /** Vendor URL for the reference video (passed as video_urls for context) */
  videoVendorUrl?: string;
  /** Vendor URL for an optional voice/audio reference */
  voiceVendorUrl?: string;
  /** User-edited prompt — shown and editable in the UI before submission */
  prompt?: string;
  /** R2 keys — stored in the DB so the library can re-sign them */
  characterKey?: string;
  refVideoKey?: string;
  /** Explicit duration from the dropdown — always used as-is, never -1 */
  durationSec?: number;
};

/**
 * POST { imageVendorUrl, videoVendorUrl?, voiceVendorUrl?, prompt,
 *         characterKey, refVideoKey, durationSec }
 * → submits to reapi Seedance 2.5 face with explicit duration
 * → returns { taskId }
 */
export const POST = adminRoute(async (req: NextRequest) => {
  const {
    imageVendorUrl,
    videoVendorUrl,
    voiceVendorUrl,
    prompt,
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
  if (!prompt?.trim()) {
    return NextResponse.json(
      { error: 'prompt is required' },
      { status: 400 },
    );
  }

  const hasAudio = Boolean(voiceVendorUrl?.trim());
  const hasVideo = Boolean(videoVendorUrl?.trim());

  const seedanceBody: Record<string, unknown> = {
    model:          SEEDANCE_MODEL,
    content_filter: false,
    prompt:         prompt.trim(),
    duration:       durationSec,   // explicit — NEVER -1
    resolution:     '480p',
    generate_audio: true,
    image_urls:     [imageVendorUrl],
  };

  // Pass the reference video as context (model uses it visually without @video1 forcing -1)
  if (hasVideo) {
    seedanceBody.video_urls = [videoVendorUrl];
  }

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
