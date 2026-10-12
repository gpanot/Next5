'use client';

import { Mic, Volume2, VolumeX } from 'lucide-react';
import { HookStyleButton } from './HookStyleButton';
import type { HookStyleState } from './useHookStyle';

const round = 'flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-ink shadow-sm transition hover:bg-zinc-50 active:scale-90 disabled:opacity-30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800';

/** On the card (the Ideas page on phones): dark glass over the picture. */
const ON_CARD = 'max-lg:border-transparent max-lg:bg-black/45 max-lg:text-white max-lg:backdrop-blur-sm max-lg:dark:border-transparent max-lg:dark:bg-black/45 max-lg:dark:text-white';

type Props = {
  soundOn: boolean;
  onToggleSound: () => void;
  /** The next narrator voice (Blitz ideas). Null: this idea takes no voice (a photo slideshow). */
  onVoice: (() => void) | null;
  /** The idea's voice now: "Warm"… */
  voiceLabel: string;
  /** Drawn on the card instead of beside it (phones only). */
  overlay?: boolean;
  /** Blitz ideas: "Hook" above the sound button, to pick the hook's look. */
  hook?: HookStyleState;
};

/** Beside the card (small, so the card stays centered), as in the Blitz deck: the hook's look, sound on/off, and the narrator voice. */
export function DeckSide({ soundOn, onToggleSound, onVoice, voiceLabel, overlay = false, hook }: Props) {
  const cls = overlay ? `${round} ${ON_CARD}` : round;
  return (
    <div className="flex flex-col gap-1.5">
      {hook && <HookStyleButton hook={hook} className={cls} />}
      <button type="button" onClick={onToggleSound} aria-pressed={soundOn} aria-label={soundOn ? 'Mute sound' : 'Turn sound on'} title={soundOn ? 'Sound on' : 'Sound off'} className={cls}>
        {soundOn ? <Volume2 aria-hidden className="h-4 w-4" /> : <VolumeX aria-hidden className="h-4 w-4" />}
      </button>
      {onVoice && (
        <button type="button" onClick={onVoice} aria-label={`Voice: ${voiceLabel}. Tap for another voice.`} title={`Voice: ${voiceLabel}. Tap for another.`} className={cls}>
          <Mic aria-hidden className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
