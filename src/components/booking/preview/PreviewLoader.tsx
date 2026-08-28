'use client';

import { useEffect, useState } from 'react';

type PreviewLoaderProps = {
  directorName: string;
  uploadedPhoto: string;
};

const stages = [
  'Reading your photo',
  'Matching your creative direction',
  'Framing your first shot',
];

const STAGE_MS = 850;

/** Narrated wait: a blank spinner for 2.5s reads as a stall, a named sequence
 *  reads as craft. */
export const PreviewLoader = ({ directorName, uploadedPhoto }: PreviewLoaderProps) => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = stages.map((_, index) =>
      window.setTimeout(() => setStage(index), index * STAGE_MS),
    );
    return () => timers.forEach(window.clearTimeout);
  }, []);

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-7 py-12 text-center">
      <div className="relative h-24 w-24">
        <span className="absolute inset-0 animate-ping rounded-full bg-accent/20" />
        <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-accent/10 p-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={uploadedPhoto}
            alt=""
            className="h-full w-full rounded-full object-cover"
          />
        </span>
      </div>

      <div>
        <p className="label-caps text-[10px] font-medium text-accent-strong">
          {directorName} is preparing your shoot
        </p>

        <ul className="mt-4 space-y-1.5" aria-live="polite">
          {stages.map((label, index) => (
            <li
              key={label}
              className={`text-[12.5px] transition-all duration-500 ${
                index <= stage ? 'text-ink' : 'text-muted/40'
              }`}
            >
              {index < stage ? '✓ ' : index === stage ? '· ' : ''}
              {label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
