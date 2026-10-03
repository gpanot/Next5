'use client';

/**
 * Keeps a deck across visits. Leaving the Content page unmounts the editor; without a cache, coming back would build
 * a brand-new deck (LLM calls, AI images) and lose the swipes. The cards — statuses, edits, music, render ids — are
 * kept in sessionStorage per run, so the deck comes back exactly as it was for the rest of the browser session.
 * Shot URLs are same-origin proxy paths, so they never expire.
 */

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { BlitzProjectDto } from './api';
import type { DeckCardData } from './SwipeDeck';

const read = (key: string | null): DeckCardData[] => {
  if (!key) return [];
  try {
    const raw = sessionStorage.getItem(key);
    const cards: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(cards) ? (cards as DeckCardData[]) : [];
  } catch {
    return [];
  }
};

/** Deck cards, read from and saved to sessionStorage under `key`. A null key = plain state (admin tab). */
export function useCachedDeckCards(key: string | null): [DeckCardData[], Dispatch<SetStateAction<DeckCardData[]>>] {
  const [cards, setCards] = useState<DeckCardData[]>(() => read(key));
  useEffect(() => {
    if (!key) return;
    try {
      if (cards.length > 0) sessionStorage.setItem(key, JSON.stringify(cards));
      else sessionStorage.removeItem(key);
    } catch {
      // Storage full or blocked: the deck still works, it just will not survive a visit away.
    }
  }, [key, cards]);
  return [cards, setCards];
}

/**
 * A restored card may point at a render still queued or rendering, which no poller is watching any more (the library
 * only lists finished ones). Once the library has loaded, starts a poller for each such render. Only the cards present
 * at mount: renders started during this visit already have their poller.
 */
export function useResumeDeckRenders(cards: DeckCardData[], library: BlitzProjectDto[], libraryLoading: boolean, watch: (projectId: string) => void) {
  const [restored] = useState(() => cards.flatMap((c) => (c.renderProjectId ? [c.renderProjectId] : [])));
  const done = useRef(false);
  useEffect(() => {
    if (libraryLoading || done.current) return;
    done.current = true;
    for (const id of restored) {
      if (library.find((p) => p.id === id)?.renderStatus !== 'COMPLETED') watch(id);
    }
  }, [restored, library, libraryLoading, watch]);
}
