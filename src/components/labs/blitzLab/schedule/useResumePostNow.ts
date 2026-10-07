'use client';

import { useEffect, useRef } from 'react';
import type { BlitzPlatform } from '../../../../types/admin/blitzSchedule';
import type { KeptTab } from '../KeptTabs';
import type { DeckCardData } from '../SwipeDeck';
import { useDeckSchedule } from './DeckSchedule';

const KEYS = ['tab', 'postNow', 'via'] as const;

/** The query a platform sign-in started from Post now comes back with: Library tab, that card, that platform. */
export const postNowResume = (cardId: string, platform: BlitzPlatform): string =>
  `tab=library&postNow=${encodeURIComponent(cardId)}&via=${platform}`;

/**
 * Back from connecting TikTok or YouTube in Post now (?tab=library&postNow=<card>&via=<platform>): opens the Library
 * tab and Post now again for that card, on that platform, so the flow continues where it stopped. Runs once, then
 * takes those keys off the URL.
 */
export function useResumePostNow(keptCards: DeckCardData[], setTab: (tab: KeptTab) => void, hasLibrary: boolean) {
  const schedule = useDeckSchedule();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || !hasLibrary) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') !== 'library') return;
    const cardId = params.get('postNow');
    const card = cardId ? keptCards.find((c) => c.id === cardId) : undefined;
    // The deck is still loading its cards: wait for them.
    if (cardId && !card && keptCards.length === 0) return;
    done.current = true;
    setTab('library');
    const via = params.get('via');
    if (card && schedule) schedule.openPostNow(card, via === 'youtube' || via === 'tiktok' ? via : undefined);
    KEYS.forEach((k) => params.delete(k));
    const rest = params.toString();
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${rest ? `?${rest}` : ''}`);
  }, [keptCards, schedule, setTab, hasLibrary]);
}
