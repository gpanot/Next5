'use client';

import { Shuffle, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef } from 'react';

const round = 'flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-ink shadow-sm transition hover:bg-zinc-50 active:scale-90 disabled:opacity-30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800';

type Props = {
  soundOn: boolean;
  onToggleSound: () => void;
  /** Null: this idea takes no other music (a photo slideshow, or no other track). */
  onShuffle: (() => void) | null;
  trackLabel: string | null;
};

/** Beside the card, as in the Blitz deck: sound on/off, and another track at random. */
export function DeckSide({ soundOn, onToggleSound, onShuffle, trackLabel }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={onToggleSound} aria-pressed={soundOn} aria-label={soundOn ? 'Mute sound' : 'Turn sound on'} title={soundOn ? 'Sound on' : 'Sound off'} className={round}>
        {soundOn ? <Volume2 aria-hidden className="h-[18px] w-[18px]" /> : <VolumeX aria-hidden className="h-[18px] w-[18px]" />}
      </button>
      {onShuffle && (
        <button type="button" onClick={onShuffle} aria-label="Pick another track at random" title={trackLabel ? `Music: ${trackLabel}. Tap for another.` : 'Another track'} className={round}>
          <Shuffle aria-hidden className="h-[18px] w-[18px]" />
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
