'use client';

/** Steps 2–4 of the clone form: the character photo, the reference video and the optional voice. */

import { ErrorLine, Section } from '../ugcLab/ui';
import { DropZone, ReplaceButton } from './DropZone';
import { type CloneUpload, type CloneVoice } from './cloneConfig';

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
const VIDEO_ACCEPT = 'video/mp4,video/quicktime';
const AUDIO_ACCEPT = '.mp3,.wav,.m4a,.aac,audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,audio/aac';

type Props = {

  character: CloneUpload | null;
  characterBusy: boolean;
  characterError: string;
  onCharacterFile: (file: File) => void;

  refVideo: CloneUpload | null;
  videoBusy: boolean;
  videoError: string;
  onVideoFile: (file: File) => void;

  voice: CloneVoice | null;
  voiceBusy: boolean;
  voiceError: string;
  onVoiceFile: (file: File) => void;
  onRemoveVoice: () => void;
};

export function CloneInputsPanel({
  character, characterBusy, characterError, onCharacterFile,
  refVideo, videoBusy, videoError, onVideoFile,
  voice, voiceBusy, voiceError, onVoiceFile, onRemoveVoice,
}: Props) {
  return (
    <>
      {/* ── 1 · Character image ─────────────────────────────────────────── */}
      <Section title="1 · Character image" description="The face and look of the new performer">
        <DropZone
          title="Character photo"
          subtitle="JPEG, PNG, or WebP · max 12 MB · portrait works best"
          accept={IMAGE_ACCEPT}
          busy={characterBusy}
          onFile={onCharacterFile}
        >
          {character ? (
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
              <img
                src={character.previewUrl}
                alt="Character preview"
                className="mx-auto h-48 w-24 rounded-xl object-cover ring-1 ring-line"
              />
              <ReplaceButton accept={IMAGE_ACCEPT} busy={characterBusy} onFile={onCharacterFile} />
            </div>
          ) : null}
        </DropZone>
        {characterError && <ErrorLine message={characterError} />}
      </Section>

      {/* ── 2 · Reference video ─────────────────────────────────────────── */}
      <Section title="2 · Reference video" description="The TikTok to clone — the duration step picks how much of it is used">
        <DropZone
          title="Reference TikTok / MP4"
          subtitle="MP4 or MOV · max 200 MB · up to 30 s is kept"
          accept={VIDEO_ACCEPT}
          busy={videoBusy}
          onFile={onVideoFile}
        >
          {refVideo ? (
            <div className="flex flex-col items-center gap-3">
              {refVideo.previewUrl ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption -- reference video
                <video src={refVideo.previewUrl} controls playsInline className="mx-auto max-h-64 max-w-xs rounded-xl ring-1 ring-line" />
              ) : (
                // Sourced from a URL, so there is no local blob to play.
                <div className="flex w-full flex-col items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-4 py-5 text-center">
                  <p className="text-[14px] font-medium text-teal-800">Sourced from TikTok — ready to clone</p>
                  <p className="text-[12px] text-teal-600">
                    {refVideo.durationSec ? `Clip: ${Math.round(refVideo.durationSec)} s` : 'Clip ready'}
                    {refVideo.frameVendorUrl && <> · <span className="font-medium">first frame ✓</span></>}
                  </p>
                </div>
              )}
              {refVideo.previewUrl && (
                <p className="text-[12px] text-muted">
                  {refVideo.durationSec ? `Clip: ${Math.round(refVideo.durationSec)} s · set the length in step 6` : 'Set the length in step 6'}
                  {refVideo.frameVendorUrl && <> · <span className="text-teal-700">first frame ✓</span></>}
                </p>
              )}
              <ReplaceButton accept={VIDEO_ACCEPT} busy={videoBusy} onFile={onVideoFile} />
            </div>
          ) : null}
        </DropZone>
        {videoError && <ErrorLine message={videoError} />}
      </Section>

      {/* ── 3 · Voice ───────────────────────────────────────────────────── */}
      <Section
        title="3 · Voice reference (optional)"
        description="If provided, added to audio_urls — prompt auto-updates to mention @Audio1"
      >
        <DropZone
          title="Voice sample"
          subtitle="MP3, WAV, M4A, or AAC · max 10 MB"
          accept={AUDIO_ACCEPT}
          busy={voiceBusy}
          onFile={onVoiceFile}
        >
          {voice ? (
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption -- user voice sample */}
              <audio controls src={voice.previewUrl} className="w-full max-w-sm" />
              <div className="flex gap-2">
                <ReplaceButton accept={AUDIO_ACCEPT} busy={voiceBusy} onFile={onVoiceFile} />
                <button
                  type="button"
                  onClick={onRemoveVoice}
                  className="inline-flex min-h-9 items-center justify-center rounded-lg border border-red-200 px-3 py-1.5 text-[12px] text-red-600 transition-colors hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : null}
        </DropZone>
        {voiceError && <ErrorLine message={voiceError} />}
      </Section>
    </>
  );
}
