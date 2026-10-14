import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../../src/server/admin/route';
import { tregCall } from '../../../../../../src/server/admin/ugcLab';
import { createCloneJob } from '../../../../../../src/server/admin/cloneVideos';

export const maxDuration = 30;

// --------------------------------------------------------------------------
// Two Seedance modes via reapi.video-gen.seedance-2-5.unrestricted
//
// face-swap    — doubao-seedance-2.5-face
//   • video_urls  → triggers video editing mode (required by the face model)
//   • duration: -1 (forced by reapi in video editing mode)
//   • output length = trimmed input video length
//
// video-update — doubao-seedance-2.5 (unrestricted)
//   • image_with_roles (character reference_image + first_frame)
//   • explicit duration from the dropdown (table-based billing)
// --------------------------------------------------------------------------

const SEEDANCE_ENDPOINT = 'reapi.video-gen.seedance-2-5.unrestricted';

const MODELS = {
  'face-swap':    'doubao-seedance-2.5-face',
  'video-update': 'doubao-seedance-2.5-face',  // reapi endpoint only accepts the -face variant
} as const;

type Mode = 'face-swap' | 'video-update';

type SubmitBody = {
  /** face-swap | video-update */
  mode?: Mode;
  /** Vendor URL for the character face image */
  imageVendorUrl?: string;
  /** Vendor URL for the full trimmed reference video (face-swap: passed as video_urls) */
  videoVendorUrl?: string;
  /** Vendor URL for the first frame JPEG (video-update: first_frame role) */
  frameVendorUrl?: string;
  /** Vendor URL for an optional voice/audio reference */
  voiceVendorUrl?: string;
  /** User-edited prompt — shown and editable in the UI before submission */
  prompt?: string;
  /** R2 keys — stored in the DB so the library can re-sign them */
  characterKey?: string;
  refVideoKey?: string;
  /** Explicit duration from the dropdown — used for video-update mode */
  durationSec?: number;
  /** Whether to ask Seedance to generate audio — maps to generate_audio. Default true. */
  generateAudio?: boolean;
};

export const POST = adminRoute(async (req: NextRequest) => {
  const {
    mode = 'face-swap',
    imageVendorUrl,
    videoVendorUrl,
    frameVendorUrl,
    voiceVendorUrl,
    prompt,
    characterKey,
    refVideoKey,
    durationSec = 5,
    generateAudio = true,
  } = (await req.json()) as SubmitBody;

  if (!imageVendorUrl?.trim()) {
    return NextResponse.json(
      { error: 'imageVendorUrl is required — upload a character image first' },
      { status: 400 },
    );
  }
  if (!prompt?.trim()) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  }

  const model = MODELS[mode] ?? MODELS['face-swap'];
  const hasAudio = Boolean(voiceVendorUrl?.trim());

  // ── Build the Seedance request body based on mode ───────────────────────

  const seedanceBody: Record<string, unknown> = {
    model,
    content_filter: false,
    prompt:         prompt.trim(),
    resolution:     '480p',
    generate_audio: generateAudio,
  };

  if (mode === 'face-swap') {
    // Video editing mode — video_urls forces duration: -1
    // The face model requires the reference video this way.
    if (!videoVendorUrl?.trim()) {
      return NextResponse.json(
        { error: 'videoVendorUrl is required for face-swap mode' },
        { status: 400 },
      );
    }
    seedanceBody.duration = -1;  // required by reapi when video_urls is present
    seedanceBody.image_with_roles = [
      { url: imageVendorUrl, role: 'reference_image' },
    ];
    seedanceBody.video_urls = [videoVendorUrl];

  } else {
    // video-update: generation mode — image_with_roles + first_frame + explicit duration
    seedanceBody.duration = durationSec;
    seedanceBody.size = 'adaptive';
    if (frameVendorUrl?.trim()) {
      seedanceBody.image_with_roles = [
        { url: imageVendorUrl, role: 'reference_image' },
        { url: frameVendorUrl, role: 'first_frame' },
      ];
    } else {
      seedanceBody.size = '9:16';
      seedanceBody.image_with_roles = [
        { url: imageVendorUrl, role: 'reference_image' },
      ];
    }
  }

  if (hasAudio) {
    seedanceBody.audio_urls = [voiceVendorUrl];
  }

  // ── Submit to reapi via Treg ────────────────────────────────────────────

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

  // ── Persist to DB ───────────────────────────────────────────────────────

  if (characterKey && refVideoKey) {
    try {
      await createCloneJob({
        poyoTaskId:  taskId,
        characterKey,
        refVideoKey,
        durationSec: mode === 'face-swap' ? durationSec : durationSec,
        model,
        resolution:  '480p',
        prompt:      prompt.trim(),
      });
    } catch (err) {
      console.error('[clone/submit] failed to persist job to DB:', err);
    }
  }

  return NextResponse.json({ taskId }, { status: 201 });
});
