'use client';

/**
 * Shown before rendering when a Slideshow contains footage.
 *
 * Still images render as a true slideshow — each card holds for the chosen
 * number of seconds. One video slide changes the output into an ordinary
 * video whose length follows the footage, so the user confirms first.
 */

import { Film } from 'lucide-react';

type FootageConfirmDialogProps = {
  /** 1-based slide numbers that carry footage. */
  videoSlideNumbers: number[];
  /** Clip length the video will have, in seconds. */
  durationSeconds: number;
  onCancel: () => void;
  onContinue: () => void;
};

export function FootageConfirmDialog({
  videoSlideNumbers,
  durationSeconds,
  onCancel,
  onContinue,
}: FootageConfirmDialogProps) {
  const many = videoSlideNumbers.length > 1;
  const list = videoSlideNumbers.join(', ');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="footage-confirm-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
    >
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-5 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-3 flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
            <Film className="h-4.5 w-4.5" />
          </span>
          <div>
            <p id="footage-confirm-title" className="text-[15px] font-semibold text-ink">
              This will render as a video, not a slideshow
            </p>
            <p className="mt-1 text-[13px] leading-snug text-muted">
              Slide{many ? 's' : ''} {list} {many ? 'use' : 'uses'} footage as {many ? 'their' : 'its'} background.
              Your slides become an ordinary {durationSeconds.toFixed(1)} s video whose length follows
              the footage, instead of holding for the seconds-per-slide you set.
            </p>
            <p className="mt-2 text-[12px] text-muted">
              Want a real slideshow? Cancel and give every slide a still image.
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-10 rounded-xl px-4 text-[13px] font-medium text-muted ring-1 ring-line transition-colors hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onContinue}
            autoFocus
            className="min-h-10 rounded-xl bg-ink px-5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            Continue as video
          </button>
        </div>
      </div>
    </div>
  );
}
