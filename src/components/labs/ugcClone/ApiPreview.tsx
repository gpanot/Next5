'use client';

/**
 * The exact reapi body the Clone button will send, shown before it is sent.
 *
 * The modes send materially different requests — two reference a video, one generates from a
 * first frame — and the difference is invisible in the form above it.
 * This makes it visible.
 */

import {
  clipSeconds,
  estimateCost,
  MODE_CONFIG,
  type CloneMode,
  type CloneUpload,
  type CloneVoice,
} from './cloneConfig';

type Props = {
  mode: CloneMode;
  character: CloneUpload;
  refVideo: CloneUpload;
  voice: CloneVoice | null;
  prompt: string;
  durationSec: number;
  generateAudio: boolean;
};

/** Signed URLs are long and carry credentials — show only enough to recognise them. */
const shorten = (url: string) => `${url.slice(0, 55)}…`;

const DIRECT_ENDPOINT = 'reapi.ai/api/v1/videos/generations (direct)';
const SEEDANCE_ENDPOINT = 'reapi.video-gen.seedance-2-5.unrestricted';

export function ApiPreview(props: Props) {
  const { mode, refVideo, voice, durationSec } = props;
  const config = MODE_CONFIG[mode];
  const body = mode === 'mini-swap' ? miniBody(props) : seedanceBody(props);

  return (
    <div className="rounded-xl border border-line bg-zinc-50 p-4 text-left">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
        API call preview — verify before clicking Clone
      </p>
      <div className="mb-3 flex flex-wrap gap-2 text-[12px]">
        <span className="rounded bg-blue-100 px-2 py-0.5 font-mono text-blue-800">
          {mode === 'mini-swap' ? DIRECT_ENDPOINT : SEEDANCE_ENDPOINT}
        </span>
        <span className="rounded bg-purple-100 px-2 py-0.5 font-mono text-purple-800">{config.model}</span>
        <span className="rounded bg-green-100 px-2 py-0.5 text-green-800">
          {clipSeconds(mode, durationSec)}s · ≈ {estimateCost(mode, durationSec)}
        </span>
        {mode !== 'video-update' && <span className="rounded bg-teal-100 px-2 py-0.5 text-teal-800">reference video ✓</span>}
        {mode === 'video-update' && refVideo.frameVendorUrl && (
          <span className="rounded bg-teal-100 px-2 py-0.5 text-teal-800">first_frame ✓</span>
        )}
        {voice && <span className="rounded bg-pink-100 px-2 py-0.5 text-pink-800">audio reference ✓</span>}
      </div>
      <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-3 text-[11px] leading-5 text-green-300">
        {JSON.stringify(body, null, 2)}
      </pre>
    </div>
  );
}

function miniBody({ character, refVideo, voice, prompt, durationSec, generateAudio }: Props): Record<string, unknown> {
  return {
    model: MODE_CONFIG['mini-swap'].model,
    prompt,
    reference_image_urls: [shorten(character.vendorUrl)],
    reference_video_urls: [shorten(refVideo.vendorUrl)],
    ...(voice && { reference_audio_urls: [shorten(voice.voiceVendorUrl)] }),
    duration: clipSeconds('mini-swap', durationSec),
    resolution: '720p',
    aspect_ratio: '9:16',
    generate_audio: generateAudio,
    bitrate_mode: 'default',
    web_search: false,
    content_filter: true,
  };
}

function seedanceBody({ mode, character, refVideo, voice, prompt, durationSec, generateAudio }: Props): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: MODE_CONFIG[mode].model,
    content_filter: false,
    prompt,
    resolution: '480p',
    generate_audio: generateAudio,
  };

  if (mode === 'face-swap') {
    // Reference mode — the prompt does the swap, the duration is the clip length.
    body.omni_reference_task_type = 'reference';
    body.duration = clipSeconds(mode, durationSec);
    body.size = '9:16';
    body.image_with_roles = [{ url: shorten(character.vendorUrl), role: 'reference_image' }];
    body.video_urls = [shorten(refVideo.vendorUrl)];
  } else {
    // Generation mode — first_frame plus an explicit duration.
    body.duration = durationSec;
    body.size = 'adaptive';
    body.image_with_roles = [
      { url: shorten(character.vendorUrl), role: 'reference_image' },
      { url: shorten(refVideo.frameVendorUrl ?? ''), role: 'first_frame' },
    ];
  }

  if (voice) body.audio_urls = [shorten(voice.voiceVendorUrl)];
  return body;
}
