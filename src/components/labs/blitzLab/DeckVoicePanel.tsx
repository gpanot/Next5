'use client';

// The narrator for the card on screen in the deck (since 2026-10-12 Blitz videos are narrated, no music): a few voices,
// each with a sample. The voiceover itself is written and recorded when the video is generated.

import { Mic, Play, Volume2, VolumeX } from 'lucide-react';
import { DEFAULT_BLITZ_VOICE, type BlitzVoiceName } from '../../../types/admin/blitzVoice';
import { useLabClient } from '../LabClientProvider';
import type { DeckCardData, DeckSound } from './SwipeDeck';
import { useBlitzVoices } from './useBlitzVoices';

type Props = {
  /** The card on screen (top of the deck or the one in Preview). Null = nothing to set a voice on. */
  card: DeckCardData | null;
  /** Deck sound on/off (the clips' own sound in the preview). */
  sound: DeckSound;
  onChange: (cardId: string, voice: BlitzVoiceName) => void;
};

export function DeckVoicePanel({ card, sound, onChange }: Props) {
  const { voices, play } = useBlitzVoices(useLabClient());
  const current = card?.voice ?? DEFAULT_BLITZ_VOICE;
  const pick = (name: BlitzVoiceName) => {
    if (!card) return;
    onChange(card.id, name);
    play(name);
  };

  return (
    <section aria-label="Voice" className="rounded-2xl border border-[var(--line,#e8e5e1)] bg-[var(--paper,#fff)] p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-[14px] font-semibold text-[var(--ink,#000)] dark:text-neutral-100">
          <Mic aria-hidden className="h-4 w-4" /> Voice
        </h2>
        <button
          type="button"
          onClick={sound.toggle}
          aria-pressed={sound.on}
          aria-label={sound.on ? 'Mute sound' : 'Turn sound on'}
          title={sound.on ? 'Sound on (M)' : 'Sound off (M)'}
          className="grid h-10 w-10 flex-none place-items-center rounded-full border border-[var(--line,#e8e5e1)] bg-[var(--paper,#fff)] text-[var(--ink,#000)] transition-colors hover:bg-[var(--soft-2,#e6e1db)] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
        >
          {sound.on ? <Volume2 aria-hidden className="h-[18px] w-[18px]" /> : <VolumeX aria-hidden className="h-[18px] w-[18px]" />}
        </button>
      </div>
      {!card ? (
        <p className="text-[13px] text-[var(--mute,#7c7d82)]">No video on screen.</p>
      ) : (
        <div className="flex flex-col gap-2">
          <div role="radiogroup" aria-label="Narrator voice" className="flex flex-col gap-1.5">
            {voices.map((v) => {
              const on = v.name === current;
              return (
                <button
                  key={v.name}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => pick(v.name)}
                  className={`flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 text-left text-[14px] font-semibold transition-all active:scale-[.98] ${
                    on
                      ? 'border-[var(--ink,#000)] bg-[var(--soft-2,#e6e1db)] text-[var(--ink,#000)] dark:border-neutral-100 dark:bg-neutral-800 dark:text-neutral-100'
                      : 'border-[var(--line,#e8e5e1)] bg-[var(--paper,#fff)] text-[var(--ink,#000)] hover:bg-[var(--soft-2,#e6e1db)] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  <span>{v.label} <span className="font-medium text-[var(--mute,#7c7d82)]">· {v.gender === 'female' ? 'woman' : 'man'}</span></span>
                  {v.sampleUrl && <Play aria-hidden className="h-4 w-4 flex-none" />}
                </button>
              );
            })}
          </div>
          <p className="text-[12px] text-[var(--mute,#7c7d82)]">Tap to hear it. The voice explains the video when you Generate.</p>
        </div>
      )}
    </section>
  );
}
