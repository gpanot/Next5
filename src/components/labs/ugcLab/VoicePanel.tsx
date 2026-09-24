'use client';

import { useRef, useState } from 'react';
import { errorOf, useLabClient } from './api';
import {
  PrimaryButton, SecondaryButton, Section, Spinner,
} from './ui';

type VoicePanelProps = {
  onVoiceReady: (voiceKey: string) => void;
  onSkip: () => void;
};

const ACCEPTED = '.mp3,.wav,.m4a,.aac,audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,audio/aac';

type UploadResult = { voiceKey: string; voiceUrl: string };

/** Optional step — upload your voice so Seedance can replicate it in the generated video. */
export function VoicePanel({ onVoiceReady, onSkip }: VoicePanelProps) {
  const client = useLabClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploaded, setUploaded] = useState<UploadResult | null>(null);

  async function upload(file: File) {
    setUploading(true);
    setUploadError('');
    const form = new FormData();
    form.append('file', file);
    const res = await client.request<Partial<UploadResult>>('/ugc-lab/voice', { form }).catch(() => null);
    setUploading(false);
    if (res?.ok && res.data.voiceKey && res.data.voiceUrl) {
      setUploaded({ voiceKey: res.data.voiceKey, voiceUrl: res.data.voiceUrl });
    } else {
      setUploadError(res ? errorOf(res) : 'Upload failed');
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void upload(file);
    e.target.value = '';
  }

  return (
    <Section
      title="Voice"
      description="Optional — upload a voice sample so Seedance can clone it for the video audio."
    >
      <div className="flex flex-col gap-5">
        {/* Upload area */}
        <div className="flex flex-col gap-3 rounded-xl border-2 border-dashed border-line bg-surface-alt p-6 text-center">
          <p className="text-[13px] font-medium text-ink">
            Upload a voice sample
          </p>
          <p className="text-[12px] text-muted">
            MP3, WAV, M4A or AAC · max 10 MB · 10–60 seconds of clear speech works best
          </p>

          {!uploaded ? (
            <>
              <div>
                <label
                  className={`inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 ${
                    uploading ? 'pointer-events-none opacity-40' : ''
                  }`}
                >
                  {uploading ? <><Spinner /> Uploading…</> : 'Choose audio file'}
                  <input
                    ref={inputRef}
                    type="file"
                    accept={ACCEPTED}
                    className="sr-only"
                    disabled={uploading}
                    onChange={handleFileChange}
                  />
                </label>
              </div>
              {uploadError && <p className="text-[13px] text-red-700">{uploadError}</p>}
            </>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <p className="text-[13px] text-emerald-700 font-medium">Voice uploaded</p>
              {/* Native audio player — lets the user confirm it's the right take */}
              {/* eslint-disable-next-line jsx-a11y/media-has-caption -- user's own voice clip */}
              <audio controls src={uploaded.voiceUrl} className="w-full max-w-sm" />
              <SecondaryButton
                onClick={() => {
                  setUploaded(null);
                  setUploadError('');
                }}
              >
                Replace
              </SecondaryButton>
            </div>
          )}
        </div>

        {/* CTA row */}
        <div className="flex flex-wrap items-center gap-3">
          {uploaded ? (
            <PrimaryButton onClick={() => onVoiceReady(uploaded.voiceKey)}>
              Use this voice →
            </PrimaryButton>
          ) : (
            !uploading && (
              <p className="text-[12px] text-muted">
                Upload a sample above, or skip and use the default Seedance voice.
              </p>
            )
          )}
          <SecondaryButton onClick={onSkip}>
            Skip — use default voice
          </SecondaryButton>
        </div>
      </div>
    </Section>
  );
}
