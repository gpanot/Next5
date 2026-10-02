'use client';

import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { useLabClient } from '../LabClientProvider';
import type { DeckCardData } from './SwipeDeck';

type Pick = { id: string; assetKey: string; url: string; startAt: number; label: string; recommended: boolean };

/**
 * Jev music pass for the deck, same as the Auto Slideshow: every new batch of cards gets the
 * best-fitting track each (all different while the library has enough). The pick becomes the
 * card's music and is remembered as `jevAudioKey`. Runs once per card; a failed call keeps the
 * engine's track.
 */
export function useDeckMusicMatch(deckCards: DeckCardData[], setDeckCards: Dispatch<SetStateAction<DeckCardData[]>>) {
  const client = useLabClient();
  const inFlight = useRef(new Set<string>());

  useEffect(() => {
    const pending = deckCards.filter((c) => !c.musicMatched && !inFlight.current.has(c.id));
    if (pending.length === 0) return;
    pending.forEach((c) => inFlight.current.add(c.id));
    // Music on each card when asked: a track the user picked meanwhile is kept.
    const asked = new Map(pending.map((c) => [c.id, c.audio?.assetKey]));

    client
      .request<{ picks: Pick[] }>('/blitz/music-match', {
        json: { cards: pending.map((c) => ({ id: c.id, texts: c.shots.map((s) => s.text), audience: c.lensValue })) },
      })
      .then((res) => (res.ok ? res.data.picks ?? [] : []))
      .catch(() => [] as Pick[])
      .then((picks) => {
        setDeckCards((prev) => prev.map((c) => {
          if (!asked.has(c.id)) return c;
          const pick = picks.find((p) => p.id === c.id && p.recommended);
          if (!pick) return { ...c, musicMatched: true };
          const untouched = c.audio?.assetKey === asked.get(c.id);
          return {
            ...c,
            musicMatched: true,
            jevAudioKey: pick.assetKey,
            audio: untouched ? { assetKey: pick.assetKey, url: pick.url, startAt: pick.startAt, label: pick.label } : c.audio,
          };
        }));
        asked.forEach((_, id) => inFlight.current.delete(id));
      });
  }, [client, deckCards, setDeckCards]);
}
