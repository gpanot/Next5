'use client';

/** Steps 2–4 of the clone form: the character photo, the reference video and the optional voice. */

import { ErrorLine, Section } from '../ugcLab/ui';
import { DropZone, ReplaceButton } from './DropZone';
import { estimateCost, type CloneDuration, type CloneUpload, type CloneVoice } from './cloneConfig';

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
const VIDEO_ACCEPT = 'video/mp4,video/quicktime';
const AUDIO_ACCEPT = '.mp3,.wav,.m4a,.aac,audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,audio/aac';

type Props = {
  maxDurationSec: CloneDuration;

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
  maxDurationSec,
  character, characterBusy, characterError, onCharacterFile,
  refVideo, videoBusy, videoError, onVideoFile,
  voice, voiceBusy, voiceError, onVoiceFile, onRemoveVoice,
}: Props) {
  const wasTrimmed = Boolean(refVideo?.durationSec && refVideo.durationSec > maxDurationSec);

  return (
    <>
      {/* ── 2 · Character image ─────────────────────────────────────────── */}
      <Section title="2 · Character image" description="The face and look of the new performer">
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

      {/* ── 3 · Reference video ─────────────────────────────────────────── */}
      <Section title="3 · Reference video" description="The TikTok to clone — trimmed to the selected duration on upload">
        <DropZone
          title="Reference TikTok / MP4"
          subtitle="MP4 or MOV · max 200 MB · longer clips are trimmed to the selected duration"
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
                    Trimmed to {maxDurationSec}s · Est. {estimateCost(maxDurationSec)}
                    {refVideo.frameVendorUrl && <> · <span className="font-medium">first frame ✓</span></>}
                  </p>
                </div>
              )}
              <p className="text-[12px] text-muted">
                {refVideo.durationSec && refVideo.durationSec > 0
                  ? `Original: ${Math.round(refVideo.durationSec)} s · Cloning: ${maxDurationSec} s · Est. ${estimateCost(maxDurationSec)}`
                  : `Cloning: ${maxDurationSec} s · Est. ${estimateCost(maxDurationSec)}`}
                {refVideo.frameVendorUrl && <> · <span className="text-teal-700">first frame ✓</span></>}
              </p>
              <ReplaceButton accept={VIDEO_ACCEPT} busy={videoBusy} onFile={onVideoFile} />
            </div>
          ) : null}
        </DropZone>
        {videoError && <ErrorLine message={videoError} />}
        {wasTrimmed && refVideo?.durationSec && (
          <p className="rounded-lg bg-blue-50 px-3 py-2 text-[12px] text-blue-800">
            Your clip is {Math.round(refVideo.durationSec)} s — trimmed to the first {maxDurationSec} s before upload.
          </p>
        )}
      </Section>

      {/* ── 4 · Voice ───────────────────────────────────────────────────── */}
      <Section
        title="4 · Voice reference (optional)"
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
