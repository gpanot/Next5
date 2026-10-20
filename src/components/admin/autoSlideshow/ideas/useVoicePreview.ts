'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { IdeaDto } from '../../../../types/admin/calendarIdeas';
import { DEFAULT_BLITZ_VOICE, isBlitzVoice, type BlitzVoiceName } from '../../../../types/admin/blitzVoice';
import type { SpokenWord } from '../../../../remotion/types';
import type { CardNarration } from '../../../labs/blitzLab/useNarrationAudio';
import { errorOf, type LabClient } from '../../../labs/labClient';
import { ideaCard } from './ideaCards';

export type VoicePreviewState =
  | { status: 'loading' }
  | { status: 'ready'; narration: CardNarration }
  | { status: 'error'; message: string; limit: boolean };

/** Wait between a voiceover arriving and its card playing. */
const SETTLE_MS = 1000;

const textsOf =(idea: IdeaDto): string[] => ideaCard(idea).shots.map((s) => s.text);
const keyFor = (id: string, voice: BlitzVoiceName, texts: string[]) => `${id}:${voice}:${texts.join('|')}`;
const keyOf = (idea: IdeaDto, voice: BlitzVoiceName) => keyFor(idea.id, voice, textsOf(idea));
/** The idea's narrator; a voice no longer offered (Kore, before 2026-10-13) is the default. */
export const voiceOf = (idea: IdeaDto): BlitzVoiceName => (isBlitzVoice(idea.card?.voice) ? idea.card.voice : DEFAULT_BLITZ_VOICE);

/**
 * The real voiceover of Blitz ideas on the deck, kept per idea, voice and caption text, so replays are free. A changed
 * hook is a new voiceover. The deck loads the top card's voice and the next card's (`ahead`), and the other voice on a
 * mic tap. A failed `ahead` load is forgotten, so the card asks again once it is on top and shows that error.
 * Once recorded, the idea's captions become the spoken lines (`onSpoken`; the server saves them too), and the voiceover
 * is kept under those captions as well.
 */
export function useVoicePreview(client: LabClient | null, onSpoken: (idea: IdeaDto, lines: string[]) => void) {
  const [byKey, setByKey] = useState<Record<string, VoicePreviewState>>({});
  const byKeyRef = useRef(byKey);
  useEffect(() => { byKeyRef.current = byKey; }, [byKey]);

  const stateOf = useCallback((idea: IdeaDto): VoicePreviewState | null => byKey[keyOf(idea, voiceOf(idea))] ?? null, [byKey]);

  const load = useCallback(async (idea: IdeaDto, voice: BlitzVoiceName, ahead = false): Promise<VoicePreviewState> => {
    const key = keyOf(idea, voice);
    const known = byKeyRef.current[key];
    if (known?.status === 'ready' || known?.status === 'loading') return known;
    if (!client) {
      const failed: VoicePreviewState = { status: 'error', message: 'Not signed in.', limit: false };
      if (!ahead) setByKey((m) => ({ ...m, [key]: failed }));
      return failed;
    }
    setByKey((m) => ({ ...m, [key]: { status: 'loading' } }));
    const res = await client
      .request<{ url: string; durations: number[]; lines?: string[]; words?: SpokenWord[][] }>('/blitz/voice-preview', { json: { texts: textsOf(idea), voice, ideaId: idea.id } })
      .catch(() => null);
    // Debug (2026-10-20): the server's reason for a failed recording (admins only get `details`).
    if (res && !res.ok) console.warn('[voice-preview]', res.status, (res.data as { details?: unknown }).details ?? errorOf(res));
    const next: VoicePreviewState = res?.ok
      ? { status: 'ready', narration: { url: res.data.url, durations: res.data.durations, words: res.data.words } }
      : { status: 'error', message: res ? errorOf(res) : 'Could not reach the server. Check your connection.', limit: res?.status === 429 };
    // A recorded voice settles a second before the card plays (2026-10-19): voice and words start in sync.
    if (next.status === 'ready') await new Promise((done) => setTimeout(done, SETTLE_MS));
    const lines = res?.ok ? res.data.lines : undefined;
    const spokenKey = lines?.length ? keyFor(idea.id, voice, lines) : null;
    setByKey((m) => {
      if (next.status === 'ready') return spokenKey ? { ...m, [key]: next, [spokenKey]: next } : { ...m, [key]: next };
      if (!ahead) return { ...m, [key]: next };
      const rest = { ...m };
      delete rest[key];
      return rest;
    });
    if (next.status === 'ready' && lines?.length) onSpoken(idea, lines);
    return next;
  }, [client, onSpoken]);

  return { stateOf, load };
}
