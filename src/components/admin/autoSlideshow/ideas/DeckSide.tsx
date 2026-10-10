'use client';

import { Shuffle, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { HookStyleButton } from './HookStyleButton';
import type { HookStyleState } from './useHookStyle';

const round = 'flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-ink shadow-sm transition hover:bg-zinc-50 active:scale-90 disabled:opacity-30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800';

/** On the card (the Ideas page on phones): dark glass over the picture. */
const ON_CARD = 'max-lg:border-transparent max-lg:bg-black/45 max-lg:text-white max-lg:backdrop-blur-sm max-lg:dark:border-transparent max-lg:dark:bg-black/45 max-lg:dark:text-white';

type Props = {
  soundOn: boolean;
  onToggleSound: () => void;
  /** Null: this idea takes no other music (a photo slideshow, or no other track). */
  onShuffle: (() => void) | null;
  trackLabel: string | null;
  /** Drawn on the card instead of beside it (phones only). */
  overlay?: boolean;
  /** Blitz ideas: "Hook" above the sound button, to pick the hook's look. */
  hook?: HookStyleState;
};

/** Beside the card (small, so the card stays centered), as in the Blitz deck: the hook's look, sound on/off, and another track at random. */
export function DeckSide({ soundOn, onToggleSound, onShuffle, trackLabel, overlay = false, hook }: Props) {
  const cls = overlay ? `${round} ${ON_CARD}` : round;
  return (
    <div className="flex flex-col gap-1.5">
      {hook && <HookStyleButton hook={hook} className={cls} />}
      <button type="button" onClick={onToggleSound} aria-pressed={soundOn} aria-label={soundOn ? 'Mute sound' : 'Turn sound on'} title={soundOn ? 'Sound on' : 'Sound off'} className={cls}>
        {soundOn ? <Volume2 aria-hidden className="h-4 w-4" /> : <VolumeX aria-hidden className="h-4 w-4" />}
      </button>
      {onShuffle && (
        <button type="button" onClick={onShuffle} aria-label="Pick another track at random" title={trackLabel ? `Music: ${trackLabel}. Tap for another.` : 'Another track'} className={cls}>
          <Shuffle aria-hidden className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/** The card's music, hidden: starts at the track's best moment on every new card or track, half volume. */
export function CardMusic({ url, startAt, playing }: { url: string | null; startAt: number; playing: boolean }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;
    if (playing) audio.play().catch(() => undefined); // autoplay may be blocked until a tap
    else audio.pause();
  }, [playing, url]);
  if (!url) return null;
  return (
    <audio
      key={url}
      ref={ref}
      src={url}
      loop
      preload="auto"
      onLoadedMetadata={(e) => {
        e.currentTarget.volume = 0.5;
        e.currentTarget.currentTime = startAt;
      }}
      className="hidden"
    />
  );
}
