'use client';

import { useEffect, useRef } from 'react';
import type { BlitzPlatform } from '../../../../types/admin/blitzSchedule';
import type { KeptTab } from '../KeptTabs';
import type { BlitzProjectDto } from '../api';
import type { DeckCardData } from '../SwipeDeck';
import { useDeckSchedule } from './DeckSchedule';

const KEYS = ['tab', 'postNow', 'via'] as const;
/** Post keys of Rendered videos tiles (see projectPostKey); their tile reopens Post now, not the deck. */
const PROJECT_PREFIX = 'project-';

const viaOf = (params: URLSearchParams): BlitzPlatform | undefined => {
  const via = params.get('via');
  return via === 'youtube' || via === 'tiktok' ? via : undefined;
};

const clearResume = (params: URLSearchParams) => {
  KEYS.forEach((k) => params.delete(k));
  const rest = params.toString();
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${rest ? `?${rest}` : ''}`);
};

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
    // A Rendered videos tile: open the Library; the tile reopens its Post now (useResumeProjectPostNow).
    if (cardId?.startsWith(PROJECT_PREFIX)) {
      done.current = true;
      setTab('library');
      return;
    }
    const card = cardId ? keptCards.find((c) => c.id === cardId) : undefined;
    // The deck is still loading its cards: wait for them.
    if (cardId && !card && keptCards.length === 0) return;
    done.current = true;
    setTab('library');
    if (card && schedule) schedule.openPostNow(card, viaOf(params));
    clearResume(params);
  }, [keptCards, schedule, setTab, hasLibrary]);
}

/** The tile side of the resume: once the library has loaded, Post now opens again for that render. */
export function useResumeProjectPostNow(projects: BlitzProjectDto[]) {
  const schedule = useDeckSchedule();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || !schedule) return;
    const params = new URLSearchParams(window.location.search);
    const key = params.get('postNow');
    if (!key?.startsWith(PROJECT_PREFIX)) return;
    const project = projects.find((p) => p.id === key.slice(PROJECT_PREFIX.length));
    if (!project) return;
    done.current = true;
    schedule.openPostNowForProject(project, viaOf(params));
    clearResume(params);
  }, [projects, schedule]);
}
