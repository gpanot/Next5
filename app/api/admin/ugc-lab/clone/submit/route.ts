import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../../src/server/admin/route';
import { tregCall } from '../../../../../../src/server/admin/ugcLab';
import { createCloneJob } from '../../../../../../src/server/admin/cloneVideos';
import { reapiRequest } from '../../../../../../src/server/admin/wan3Provider';
import { trimStoredClip } from '../../../../../../src/server/admin/cloneUtils';

// Trimming the reference clip at submit (download, ffmpeg, upload) can take a while.
export const maxDuration = 120;

// --------------------------------------------------------------------------
// Two Seedance 2.5 modes via reapi.video-gen.seedance-2-5.unrestricted
//
// face-swap    — doubao-seedance-2.5-face
//   • video_urls as a reference (omni_reference_task_type 'reference'), not edit mode:
//     the prompt does the swap, so the duration is explicit (= trimmed clip length)
//   • reAPI still bills source + output seconds whenever video_urls is sent
//
// video-update — doubao-seedance-2.5 (unrestricted)
//   • image_with_roles (character reference_image + first_frame)
//   • explicit duration from the dropdown (table-based billing)

//
// mini-swap    — seedance-2.0-mini, reAPI direct (REAPI_API_KEY)
//   • reference_image_urls + reference_video_urls, prompt does the swap
//   • 4–15 s, 720p, billed source + output seconds (~$0.48 for a 5 s clip)
// --------------------------------------------------------------------------

const SEEDANCE_ENDPOINT = 'reapi.video-gen.seedance-2-5.unrestricted';

const MODELS = {
  'face-swap':    'doubao-seedance-2.5-face',
  'video-update': 'doubao-seedance-2.5-face',  // reapi endpoint only accepts the -face variant
  'mini-swap':    'seedance-2.0-mini',
} as const;

/** Output limits per model (reapi.ai docs, 2026-10-17): Seedance 2.5 4–30 s, Mini 4–15 s. */
const MAX_SEC: Record<Mode, number> = { 'face-swap': 30, 'video-update': 30, 'mini-swap': 15 };
const clampDuration = (sec: number, max: number) => Math.min(max, Math.max(4, Math.round(sec)));

type Mode = keyof typeof MODELS;

type SubmitBody = {
  /** face-swap | video-update | mini-swap */
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
  /** Seconds to generate — the trimmed clip length for the swap modes, the dropdown for video-update */
  durationSec?: number;
  /** Swap modes: the duration is shorter than the uploaded clip, so cut the clip to it first. */
  trimClip?: boolean;
  /** Whether to ask Seedance to generate audio — maps to generate_audio. Default true. */
  generateAudio?: boolean;
};

export const POST = adminRoute(async (req: NextRequest) => {
  const {
    mode = 'face-swap',
    imageVendorUrl,
    videoVendorUrl: rawVideoUrl,
    frameVendorUrl,
    voiceVendorUrl,
    prompt,
    characterKey,
    refVideoKey: rawVideoKey,
    durationSec = 5,
    trimClip = false,
    generateAudio = true,
  } = (await req.json()) as SubmitBody;
  let videoVendorUrl = rawVideoUrl;
  let refVideoKey = rawVideoKey;

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

  // The duration step chose fewer seconds than the clip has: send a reference of exactly that length.
  if (trimClip && mode !== 'video-update' && rawVideoKey) {
    try {
      const cut = await trimStoredClip(rawVideoKey, clampDuration(durationSec, MAX_SEC[mode]));
      refVideoKey = cut.key;
      videoVendorUrl = cut.vendorUrl;
    } catch (err) {
      console.error('[clone/submit] trim failed:', err);
      return NextResponse.json({ error: (err as Error).message }, { status: 422 });
    }
  }

  let taskId: string;
  if (mode === 'mini-swap') {
    if (!videoVendorUrl?.trim()) {
      return NextResponse.json({ error: 'videoVendorUrl is required for Seedance Mini' }, { status: 400 });
    }
    const seconds = clampDuration(durationSec, MAX_SEC['mini-swap']);
    try {
      taskId = await submitSeedanceMini({
        prompt: prompt.trim(), imageUrl: imageVendorUrl, videoUrl: videoVendorUrl,
        voiceUrl: voiceVendorUrl?.trim() || undefined, durationSec: seconds, generateAudio,
      });
    } catch (err) {
      console.error('[clone/submit] reapi mini error:', err);
      return NextResponse.json({ error: (err as Error).message ?? 'Failed to submit to Seedance Mini' }, { status: 502 });
    }
    await persistJob({ taskId, characterKey, refVideoKey, durationSec: seconds, model, resolution: '720p', prompt: prompt.trim() });
    return NextResponse.json({ taskId }, { status: 201 });
  }

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
    // Reference mode — the video is a reference, the prompt asks for the swap.
    if (!videoVendorUrl?.trim()) {
      return NextResponse.json(
        { error: 'videoVendorUrl is required for face-swap mode' },
        { status: 400 },
      );
    }
    seedanceBody.omni_reference_task_type = 'reference';
    seedanceBody.duration = clampDuration(durationSec, MAX_SEC['face-swap']);
    seedanceBody.size = '9:16';
    seedanceBody.image_with_roles = [
      { url: imageVendorUrl, role: 'reference_image' },
    ];
    seedanceBody.video_urls = [videoVendorUrl];

  } else {
    // video-update: generation mode — image_with_roles + first_frame + explicit duration
    seedanceBody.duration = clampDuration(durationSec, MAX_SEC['video-update']);
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

  await persistJob({
    taskId, characterKey, refVideoKey, model, resolution: '480p', prompt: prompt.trim(),
    durationSec: seedanceBody.duration as number,
  });

  return NextResponse.json({ taskId }, { status: 201 });
});

/** Seedance 2.0 Mini on reAPI direct: character as a reference image, the clip as a reference video. */
async function submitSeedanceMini(input: {
  prompt: string; imageUrl: string; videoUrl: string; voiceUrl?: string; durationSec: number; generateAudio: boolean;
}): Promise<string> {
  const res = await reapiRequest<{ id?: string; task_id?: string }>('POST', '/videos/generations', {
    model: MODELS['mini-swap'],
    prompt: input.prompt,
    reference_image_urls: [input.imageUrl],
    reference_video_urls: [input.videoUrl],
    ...(input.voiceUrl && { reference_audio_urls: [input.voiceUrl] }),
    duration: input.durationSec,
    resolution: '720p',
    aspect_ratio: '9:16',
    generate_audio: input.generateAudio,
    bitrate_mode: 'default',
    web_search: false,
    content_filter: true,
  });
  const taskId = res.id ?? res.task_id ?? '';
  if (!taskId) throw new Error('No task ID returned from reapi');
  return taskId;
}

/** Library record, so the clone shows up and gets mirrored to R2. Best effort: the task runs either way. */
async function persistJob(job: {
  taskId: string; characterKey?: string; refVideoKey?: string; durationSec: number;
  model: string; resolution: string; prompt: string;
}): Promise<void> {
  if (!job.characterKey || !job.refVideoKey) return;
  try {
    await createCloneJob({
      poyoTaskId:  job.taskId,
      characterKey: job.characterKey,
      refVideoKey: job.refVideoKey,
      durationSec: job.durationSec,
      model:       job.model,
      resolution:  job.resolution,
      prompt:      job.prompt,
    });
  } catch (err) {
    console.error('[clone/submit] failed to persist job to DB:', err);
  }
}
