'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BLITZ_VOICES, type BlitzVoiceName, type BlitzVoiceOption } from '../../../types/admin/blitzVoice';
import type { LabClient } from '../labClient';

/**
 * The narrator voices a Blitz card can take (since 2026-10-12, instead of music), with their sample lines, loaded
 * once. `play` reads a voice's sample (stopping the one before); the voices show without samples until they load.
 */
export function useBlitzVoices(client: LabClient | null) {
  const [voices, setVoices] = useState<BlitzVoiceOption[]>(() => BLITZ_VOICES.map((v) => ({ ...v, sampleUrl: null })));
  const player = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    void client.request<{ voices: BlitzVoiceOption[] }>('/blitz/voices').then((res) => {
      if (!cancelled && res.ok) setVoices(res.data.voices);
    }).catch(() => undefined);
    return () => {
      cancelled = true;
      player.current?.pause();
    };
  }, [client]);

  const play = useCallback((name: BlitzVoiceName) => {
    const url = voices.find((v) => v.name === name)?.sampleUrl;
    player.current?.pause();
    if (!url) return;
    player.current = new Audio(url);
    player.current.play().catch(() => undefined); // blocked until the first tap on some browsers
  }, [voices]);

  return { voices, play };
}
