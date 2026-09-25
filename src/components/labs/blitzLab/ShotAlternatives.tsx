'use client';

import type { MediaChoice } from './shotFormat';

type ShotAlternativesProps = {
  choices: MediaChoice[];
  /** R2 key of the slide's current background, to mark the active choice. */
  currentKey?: string;
  onPick: (choice: MediaChoice) => void;
};

/** Row of runner-up clips the engine found for this shot. One tap swaps the background. */
export function ShotAlternatives({ choices, currentKey, onPick }: ShotAlternativesProps) {
  const swappable = choices.filter((c) => c.assetKey);
  if (swappable.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5" role="group" aria-label="Other clips for this shot">
      <span className="shrink-0 text-[10px] font-medium text-muted">Swap</span>
      {swappable.map((c) => {
        const active = c.assetKey === currentKey;
        return (
          <button
            key={c.assetKey}
            type="button"
            onClick={() => onPick(c)}
            title={c.mediaLabel}
            aria-label={`Use ${c.mediaLabel}`}
            aria-pressed={active}
            className={[
              'relative h-12 w-[27px] shrink-0 overflow-hidden rounded-md bg-neutral-900 ring-offset-1 transition-shadow',
              active ? 'ring-2 ring-orange-500' : 'ring-1 ring-line hover:ring-orange-400 dark:ring-neutral-700',
            ].join(' ')}
          >
            {c.mediaKind === 'video' ? (
              <video src={c.mediaUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.mediaUrl} alt="" className="h-full w-full object-cover" />
            )}
          </button>
        );
      })}
    </div>
  );
}
