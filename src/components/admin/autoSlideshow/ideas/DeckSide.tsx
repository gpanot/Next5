'use client';

import { Loader2, Mic, Pause, Play, Shuffle, Undo2, Volume2, VolumeX } from 'lucide-react';
import type { VoicePreviewState } from './useVoicePreview';
import { VOICE_READY_S, VoiceCountdown } from './VoiceCountdown';

const round = 'flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-ink shadow-sm transition hover:bg-zinc-50 active:scale-90 disabled:opacity-30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800';

/** While paused: another clip for the shot on screen, and back to the one before. */
export type ShotSwap = {
  /** Null: this shot cannot swap. */
  onSwap: (() => void) | null;
  /** Null: nothing swapped on this card yet. */
  onUndo: (() => void) | null;
  /** Looking for the next one. */
  busy: boolean;
  /** What the shot shows: a photo swaps for a photo, a clip for a clip. */
  kind: 'photo' | 'clip';
};

type Props = {
  soundOn: boolean;
  onToggleSound: () => void;
  paused: boolean;
  onTogglePause: () => void;
  /** Blitz ideas: shown while paused. */
  swap?: ShotSwap;
  /** The next narrator voice (Blitz ideas). Null: this idea takes no voice (a photo slideshow). */
  onVoice: (() => void) | null;
  /** The idea's voice now: "woman" or "man". */
  voiceLabel: string;
  /** Its voiceover: null before it starts recording, loading while it records. */
  voiceState?: VoicePreviewState['status'] | null;
};

/** Paused: undo a swap, then swap the shot's clip, above play / pause. */
function SwapButtons({ swap }: { swap: ShotSwap }) {
  return (
    <>
      {swap.onUndo && (
        <button type="button" onClick={swap.onUndo} aria-label={`Undo the ${swap.kind} swap`} title={`Back to the ${swap.kind} before`} className={round}>
          <Undo2 aria-hidden className="h-4 w-4" />
        </button>
      )}
      <button type="button" onClick={swap.busy ? undefined : (swap.onSwap ?? undefined)} disabled={!swap.onSwap} aria-busy={swap.busy} aria-label={`Swap this ${swap.kind}`} title={swap.onSwap ? `Another ${swap.kind}` : `This ${swap.kind} cannot be swapped`} className={`${round} ${swap.busy ? 'cursor-wait' : ''}`}>
        {swap.busy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Shuffle aria-hidden className="h-4 w-4" />}
      </button>
    </>
  );
}

/** Beside the card (small, so the card stays centered), as in the Blitz deck: swap (paused), play / pause, sound on/off, and the narrator voice. */
export function DeckSide({ soundOn, onToggleSound, paused, onTogglePause, swap, onVoice, voiceLabel, voiceState = null }: Props) {
  const recording = voiceState === 'loading';
  const voiceHint = recording ? `Recording the ${voiceLabel}'s voice. Ready in about ${VOICE_READY_S} seconds.` : `Voice: ${voiceLabel}. Tap to switch.`;
  return (
    <div className="flex flex-col gap-1.5">
      {paused && swap && <SwapButtons swap={swap} />}
      <button type="button" onClick={onTogglePause} aria-pressed={paused} aria-label={paused ? 'Play' : 'Pause'} title={paused ? 'Play' : 'Pause'} className={round}>
        {paused ? <Play aria-hidden className="h-4 w-4" /> : <Pause aria-hidden className="h-4 w-4" />}
      </button>
      <button type="button" onClick={onToggleSound} aria-pressed={soundOn} aria-label={soundOn ? 'Mute sound' : 'Turn sound on'} title={soundOn ? 'Sound on' : 'Sound off'} className={round}>
        {soundOn ? <Volume2 aria-hidden className="h-4 w-4" /> : <VolumeX aria-hidden className="h-4 w-4" />}
      </button>
      {onVoice && (
        <button type="button" onClick={recording ? undefined : onVoice} aria-disabled={recording} aria-busy={recording} aria-label={voiceHint} title={voiceHint} className={`${round} ${recording ? 'cursor-wait' : ''}`}>
          {recording ? <VoiceCountdown /> : <Mic aria-hidden className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}
