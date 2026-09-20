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
  /** Vendor URL for the first frame JPEG of the reference video (first_frame role) */
  frameVendorUrl?: string;
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
    frameVendorUrl,
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

  // KEY FINDING: passing video_urls ALWAYS forces reapi into video editing mode (duration: -1),
  // regardless of prompt content. To use explicit duration we must use first_frame instead.
  // character image → reference_image role (face reference)
  // first frame of video → first_frame role (scene/background anchor)
  const hasFrame = Boolean(frameVendorUrl?.trim());

  const seedanceBody: Record<string, unknown> = {
    model:          SEEDANCE_MODEL,
    content_filter: false,
    prompt:         prompt.trim(),
    duration:       durationSec,   // explicit — NEVER -1
    resolution:     '480p',
    generate_audio: true,
  };

  if (hasFrame) {
    // image_with_roles: character face + first frame as scene anchor
    seedanceBody.size = 'adaptive';
    seedanceBody.image_with_roles = [
      { url: imageVendorUrl,     role: 'reference_image' },
      { url: frameVendorUrl,     role: 'first_frame' },
    ];
  } else {
    // No frame extracted — fallback to character only
    seedanceBody.size = '9:16';
    seedanceBody.image_urls = [imageVendorUrl];
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
        model:      SEEDANCE_MODEL,
        resolution: '480p',
        prompt:     prompt.trim(),
      });
    } catch (err) {
      console.error('[clone/submit] failed to persist job to DB:', err);
    }
  }

  return NextResponse.json({ taskId }, { status: 201 });
});
