'use client';

// Under the editor's preview: the narrator of a deck video, Female or Male. The same two voices the video is rendered
// with (BLITZ_VOICES, Gemini TTS); "Play it" plays the real voiceover in the voice picked here.

import { BLITZ_VOICES, DEFAULT_BLITZ_VOICE, type BlitzVoiceName } from '../../../types/admin/blitzVoice';
import type { LabClient } from '../labClient';
import type { CardNarration } from './useNarrationAudio';

type Props = { voice: BlitzVoiceName | undefined; onChange: (voice: BlitzVoiceName) => void };

/** The voiceover of these slide texts in `voice`, as the render will use it (recorded once, then from the cache). */
export const fetchNarration = async (client: LabClient, texts: string[], voice: BlitzVoiceName | undefined): Promise<CardNarration | null> => {
  const lines = texts.filter((t) => t.trim());
  if (lines.length === 0) return null;
  const res = await client.request<{ url: string; durations: number[] }>('/blitz/voice-preview', { json: { texts: lines, voice: voice ?? DEFAULT_BLITZ_VOICE } }).catch(() => null);
  return res?.ok ? { url: res.data.url, durations: res.data.durations } : null;
};

export function VoiceToggle({ voice, onChange }: Props) {
  const current = voice ?? DEFAULT_BLITZ_VOICE;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[13px] font-semibold text-[var(--ink,#000)] dark:text-neutral-100">Voice</span>
      <div role="radiogroup" aria-label="Narrator voice" className="inline-flex rounded-full border border-[var(--line,#e8e5e1)] bg-[var(--paper,#fff)] p-1 dark:border-neutral-700 dark:bg-neutral-900">
        {BLITZ_VOICES.map((v) => {
          const on = v.name === current;
          return (
            <button
              key={v.name}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(v.name)}
              className={`min-h-9 rounded-full px-4 text-[13px] font-semibold transition active:scale-95 ${on ? 'bg-[var(--ink,#000)] text-white dark:bg-white dark:text-neutral-900' : 'text-[var(--mute,#7c7d82)] hover:text-[var(--ink,#000)] dark:hover:text-neutral-100'}`}
            >
              {v.gender === 'female' ? 'Female' : 'Male'}
            </button>
          );
        })}
      </div>
    </div>
  );
}
