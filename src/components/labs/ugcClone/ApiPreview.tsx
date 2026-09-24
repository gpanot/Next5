'use client';

/**
 * The exact reapi body the Clone button will send, shown before it is sent.
 *
 * The two modes send materially different requests — one edits a video, the other generates from
 * a first frame — and the difference is invisible in the form above it. This makes it visible.
 */

import {
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

export function ApiPreview({ mode, character, refVideo, voice, prompt, durationSec, generateAudio }: Props) {
  const config = MODE_CONFIG[mode];

  const body: Record<string, unknown> = {
    model: config.model,
    content_filter: false,
    prompt,
    resolution: '480p',
    generate_audio: generateAudio,
  };

  if (mode === 'face-swap') {
    // Video editing mode — video_urls forces duration: -1.
    body.duration = -1;
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

  return (
    <div className="rounded-xl border border-line bg-zinc-50 p-4 text-left">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
        API call preview — verify before clicking Clone
      </p>
      <div className="mb-3 flex flex-wrap gap-2 text-[12px]">
        <span className="rounded bg-blue-100 px-2 py-0.5 font-mono text-blue-800">
          reapi.video-gen.seedance-2-5.unrestricted
        </span>
        <span className="rounded bg-purple-100 px-2 py-0.5 font-mono text-purple-800">{config.model}</span>
        {mode === 'face-swap' ? (
          <span className="rounded bg-orange-100 px-2 py-0.5 text-orange-800">duration: -1 (video editing)</span>
        ) : (
          <span className="rounded bg-green-100 px-2 py-0.5 text-green-800">
            duration: {durationSec}s · ≈ {estimateCost(durationSec)}
          </span>
        )}
        {mode === 'face-swap' && <span className="rounded bg-teal-100 px-2 py-0.5 text-teal-800">video_urls ✓</span>}
        {mode === 'video-update' && refVideo.frameVendorUrl && (
          <span className="rounded bg-teal-100 px-2 py-0.5 text-teal-800">first_frame ✓</span>
        )}
        {voice && <span className="rounded bg-pink-100 px-2 py-0.5 text-pink-800">audio_urls ✓</span>}
      </div>
      <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-3 text-[11px] leading-5 text-green-300">
        {JSON.stringify(body, null, 2)}
      </pre>
    </div>
  );
}
