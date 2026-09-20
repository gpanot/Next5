import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../../src/server/admin/route';
import { tregCall } from '../../../../../../src/server/admin/ugcLab';
import { createCloneJob } from '../../../../../../src/server/admin/cloneVideos';

export const maxDuration = 30;

// --------------------------------------------------------------------------
// Seedance 2.5 face model via reapi (same infrastructure as UGC Lab)
// No video_urls → no video-editing mode → explicit duration → table pricing
// --------------------------------------------------------------------------
const SEEDANCE_ENDPOINT = 'reapi.video-gen.seedance-2-5.unrestricted';
const SEEDANCE_MODEL    = 'doubao-seedance-2.5-face';

/** USD per second for doubao-seedance-2.5-face at 480p (reapi pricing). */
const USD_PER_SEC = 0.59 / 5; // ~$0.118 / sec

function buildPrompt(hasAudio: boolean): string {
  const base =
    'The person in @image1 speaks naturally and expressively to camera ' +
    'in a casual UGC selfie video. Replace any person in the scene with the face ' +
    'from @image1 while preserving the original background, lighting, and energy. ' +
    'Natural facial expressions and movements, handheld 9:16 vertical framing.';

  return hasAudio
    ? base + ' Use the voice from @audio1 as the speech audio reference.'
    : base;
}

type SubmitBody = {
  /** Vendor URL for the character face image (accessed by Seedance) */
  imageVendorUrl?: string;
  /** Vendor URL for the first frame of the reference video (first_frame role) */
  frameVendorUrl?: string;
  /** Vendor URL for an optional voice/audio reference */
  voiceVendorUrl?: string;
  /** R2 keys — stored in the DB so the library can re-sign them */
  characterKey?: string;
  refVideoKey?: string;
  durationSec?: number;
};

/**
 * POST {
 *   imageVendorUrl, frameVendorUrl?, voiceVendorUrl?,
 *   characterKey, refVideoKey, durationSec
 * }
 * → submits to reapi Seedance 2.5 face (same as UGC Lab)
 * → returns { taskId, body } — body shown in the UI preview
 */
export const POST = adminRoute(async (req: NextRequest) => {
  const {
    imageVendorUrl,
    frameVendorUrl,
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

  const hasAudio = Boolean(voiceVendorUrl?.trim());
  const hasFrame = Boolean(frameVendorUrl?.trim());
  const prompt   = buildPrompt(hasAudio);

  // Build the Seedance request body — same schema as UGC Lab
  const seedanceBody: Record<string, unknown> = {
    model:          SEEDANCE_MODEL,
    content_filter: false,
    prompt,
    duration:       durationSec,
    resolution:     '480p',
    generate_audio: true,
  };

  if (hasFrame) {
    // image_with_roles: character as reference_image + video first-frame as scene anchor
    seedanceBody.size = 'adaptive';
    seedanceBody.image_with_roles = [
      { url: imageVendorUrl, role: 'reference_image' },
      { url: frameVendorUrl, role: 'first_frame' },
    ];
  } else {
    // Fallback: character image only
    seedanceBody.size = '9:16';
    seedanceBody.image_urls = [imageVendorUrl];
  }

  if (hasAudio) {
    seedanceBody.audio_urls = [voiceVendorUrl];
  }

  // ------------------------------------------------------------------
  // Submit to reapi via Treg — identical to UGC Lab generation call
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
        poyoTaskId: taskId, // field reused for reapi task ID
        characterKey,
        refVideoKey,
        durationSec,
      });
    } catch (err) {
      console.error('[clone/submit] failed to persist job to DB:', err);
    }
  }

  // Return the body we sent (with URLs masked to first 60 chars for the UI preview)
  const previewBody = {
    ...seedanceBody,
    image_with_roles: hasFrame
      ? [
          { url: `${imageVendorUrl.slice(0, 60)}…`, role: 'reference_image' },
          { url: `${(frameVendorUrl ?? '').slice(0, 60)}…`, role: 'first_frame' },
        ]
      : undefined,
    image_urls: !hasFrame ? [`${imageVendorUrl.slice(0, 60)}…`] : undefined,
    audio_urls: hasAudio ? [`${(voiceVendorUrl ?? '').slice(0, 60)}…`] : undefined,
  };

  const estimatedCost = (USD_PER_SEC * durationSec).toFixed(2);

  return NextResponse.json(
    { taskId, body: previewBody, estimatedCost },
    { status: 201 },
  );
});
