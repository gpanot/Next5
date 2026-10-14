'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { IdeaDto } from '../../../../types/admin/calendarIdeas';
import { DEFAULT_BLITZ_VOICE, isBlitzVoice, type BlitzVoiceName } from '../../../../types/admin/blitzVoice';
import type { CardNarration } from '../../../labs/blitzLab/useNarrationAudio';
import { errorOf, type LabClient } from '../../../labs/labClient';
import { ideaCard } from './ideaCards';

export type VoicePreviewState =
  | { status: 'loading' }
  | { status: 'ready'; narration: CardNarration }
  | { status: 'error'; message: string; limit: boolean };

const textsOf = (idea: IdeaDto): string[] => ideaCard(idea).shots.map((s) => s.text);
const keyOf = (idea: IdeaDto, voice: BlitzVoiceName) => `${idea.id}:${voice}:${textsOf(idea).join('|')}`;
/** The idea's narrator; a voice no longer offered (Kore, before 2026-10-13) is the default. */
export const voiceOf = (idea: IdeaDto): BlitzVoiceName => (isBlitzVoice(idea.card?.voice) ? idea.card.voice : DEFAULT_BLITZ_VOICE);

/**
 * The real voiceover of Blitz ideas on the deck, kept per idea, voice and caption text, so replays are free. A changed
 * hook is a new voiceover. The deck loads the top card's voice and the next card's (`ahead`), and the other voice on a
 * mic tap. A failed `ahead` load is forgotten, so the card asks again once it is on top and shows that error.
 */
export function useVoicePreview(client: LabClient | null) {
  const [byKey, setByKey] = useState<Record<string, VoicePreviewState>>({});
  const byKeyRef = useRef(byKey);
  useEffect(() => { byKeyRef.current = byKey; }, [byKey]);

  const stateOf = useCallback((idea: IdeaDto): VoicePreviewState | null => byKey[keyOf(idea, voiceOf(idea))] ?? null, [byKey]);

  const load = useCallback(async (idea: IdeaDto, voice: BlitzVoiceName, ahead = false): Promise<VoicePreviewState> => {
    const key = keyOf(idea, voice);
    const known = byKeyRef.current[key];
    if (known?.status === 'ready' || known?.status === 'loading') return known;
    if (!client) return { status: 'error', message: 'Not signed in.', limit: false };
    setByKey((m) => ({ ...m, [key]: { status: 'loading' } }));
    const res = await client
      .request<{ url: string; durations: number[] }>('/blitz/voice-preview', { json: { texts: textsOf(idea), voice } })
      .catch(() => null);
    const next: VoicePreviewState = res?.ok
      ? { status: 'ready', narration: { url: res.data.url, durations: res.data.durations } }
      : { status: 'error', message: res ? errorOf(res) : 'Could not reach the server. Check your connection.', limit: res?.status === 429 };
    setByKey((m) => {
      if (next.status === 'ready' || !ahead) return { ...m, [key]: next };
      const rest = { ...m };
      delete rest[key];
      return rest;
    });
    return next;
  }, [client]);

  return { stateOf, load };
}
