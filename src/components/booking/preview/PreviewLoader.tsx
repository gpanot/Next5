'use client';

import type { CreativeDirector } from '../../../types/booking';
import { DirectorNote } from './DirectorNote';
import { GenerationProgressBar } from './GenerationProgressBar';
import { PreviewSocialProof } from './PreviewSocialProof';

type PreviewLoaderProps = {
  label: string;
  uploadedPhoto: string;
  director: CreativeDirector;
  /** Same note used on the reveal screen — this is where she first "meets"
   *  the photographer, typed out live rather than shown after the fact. */
  note: string | null;
};

/** Shared wait screen for the real generation phases. One thing streams (the
 *  director's note, once); everything else is static until she scrolls it —
 *  a busy screen doesn't read as calmer than a bare spinner. */
export const PreviewLoader = ({ label, uploadedPhoto, director, note }: PreviewLoaderProps) => (
  <div className="flex min-h-full flex-col items-center gap-5 py-10 text-center">
    <div className="relative h-20 w-20 shrink-0">
      <span className="absolute inset-0 animate-ping rounded-full bg-accent/20" />
      <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 p-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={uploadedPhoto} alt="" className="h-full w-full rounded-full object-cover" />
      </span>
    </div>

    <p className="label-caps text-[10px] font-medium text-accent-strong" aria-live="polite">
      {label}
    </p>

    <div className="w-full max-w-[380px]">
      <DirectorNote director={director} note={note} stream />
    </div>

    <div className="w-full max-w-[380px]">
      <PreviewSocialProof />
    </div>

    <div className="w-full max-w-[380px]">
      <GenerationProgressBar />
    </div>
  </div>
);
