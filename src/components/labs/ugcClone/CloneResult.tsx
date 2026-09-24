'use client';

/** The finished clone: play it, download it, or start another. */

import { SecondaryButton, Section } from '../ugcLab/ui';

export function CloneResult({ videoUrl, onReset }: { videoUrl: string; onReset: () => void }) {
  return (
    <Section title="Clone ready">
      <div className="flex flex-col items-center gap-4">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption -- generated video, no captions */}
        <video src={videoUrl} controls playsInline className="max-h-[600px] w-full max-w-xs rounded-xl ring-1 ring-line" />
        <div className="flex flex-wrap gap-3">
          <a
            href={videoUrl}
            download="ugc-clone.mp4"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
          >
            Download MP4
          </a>
          <SecondaryButton onClick={onReset}>Start new clone</SecondaryButton>
        </div>
      </div>
    </Section>
  );
}
