'use client';

import { useRef, useState } from 'react';
import type { IdeaDto } from '../../../../types/admin/calendarIdeas';
import { deckRenderBody, type RenderBodyContext } from '../../../labs/blitzLab/deckRenderBody';
import { scheduleApi } from '../../../labs/blitzLab/schedule/scheduleApi';
import { toSlide } from '../../../labs/blitzLab/useDeckCardEditor';
import { errorOf, type LabClient } from '../../../labs/labClient';
import { announceCreditsChanged } from '../creditsEvents';
import { ideaCard } from './ideaCards';
import { ideasApi } from './ideasApi';
import { loadRenderContext } from './renderContext';

type Options = {
  client: LabClient | null;
  runId: string;
  /** Pins made slideshows to their idea's time (slideshow id → ISO time), so they sit on that day. */
  pinSlideshows: (pins: Record<string, string>) => void;
  /** Called once the made ideas are on the calendar (Blitz videos and the run reload). */
  onMade: () => void;
};

/** A kept Blitz idea on the calendar as a planned video (1 credit now, refunded if not approved in time). */
const scheduleBlitz = async (client: LabClient, ctx: RenderBodyContext, idea: IdeaDto): Promise<string | null> => {
  const card = ideaCard(idea);
  const built = await deckRenderBody(client, card, card.shots.map(toSlide), ctx);
  if ('error' in built) return built.error;
  const at = new Date(idea.plannedAt);
  const res = await scheduleApi.create(client, {
    cardId: idea.id, variantId: idea.id, title: idea.hook, scheduledAt: at.toISOString(), tzOffsetMin: at.getTimezoneOffset(), renderBody: built.body,
  }).catch(() => null);
  return res?.ok ? null : res ? errorOf(res) : 'Could not reach the server. Check your connection.';
};

/** Kept slideshow ideas (already made while the user swiped): moved into the run, charged, pinned to their days. */
const makeSlideshows = async (client: LabClient, o: Options, ideas: IdeaDto[]): Promise<Record<string, string>> => {
  if (ideas.length === 0) return {};
  const res = await ideasApi.make(client, o.runId, ideas.map((i) => i.id)).catch(() => null);
  if (!res?.ok) {
    const error = res ? errorOf(res) : 'Could not reach the server. Check your connection.';
    return Object.fromEntries(ideas.map((i) => [i.id, error]));
  }
  if (res.data.made.length > 0) o.pinSlideshows(Object.fromEntries(res.data.made.map((m) => [m.slideshowId, m.plannedAt])));
  return res.data.errors;
};

/** Makes one batch of kept ideas; returns the reason for each one that failed. */
const makeBatch = async (client: LabClient, o: Options, kept: IdeaDto[]): Promise<Record<string, string>> => {
  const next: Record<string, string> = { ...(await makeSlideshows(client, o, kept.filter((i) => i.format === 'slideshow'))) };
  const videos = kept.filter((i) => i.format === 'blitz');
  const ctx = videos.length > 0 ? await loadRenderContext(client).catch((err: unknown) => (err instanceof Error ? err.message : 'Could not load the video template.')) : null;
  for (const idea of videos) {
    const error = typeof ctx === 'string' ? ctx : ctx ? await scheduleBlitz(client, ctx, idea) : null;
    if (error) next[idea.id] = error;
  }
  return next;
};

/**
 * A kept idea becomes a post on its day right away (swipe right = keep = 1 credit). Videos are scheduled one by one
 * (each its own credit); slideshows (made while the user swiped) move into the run, each charged as it moves. Ideas
 * kept while a batch runs wait in a queue, so fast swipes are never dropped. Failed ones stay kept, with the reason,
 * so "Try again" can make them.
 */
export function useMakeIdeas(o: Options) {
  const [making, setMaking] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const queue = useRef<IdeaDto[]>([]);
  const running = useRef(false);

  /** `prepare` runs first (saving the keep and its day), with "making" already shown; false stops there. */
  const make = async (kept: IdeaDto[], prepare?: () => Promise<boolean>) => {
    if (!o.client || kept.length === 0) return;
    setMaking(true);
    if (prepare && !(await prepare())) {
      if (!running.current) setMaking(false);
      return;
    }
    queue.current.push(...kept);
    if (running.current) return;
    running.current = true;
    setMaking(true);
    while (queue.current.length > 0) {
      const batch = queue.current.splice(0);
      const failed = await makeBatch(o.client, o, batch);
      setErrors((e) => ({ ...Object.fromEntries(Object.entries(e).filter(([id]) => !batch.some((i) => i.id === id))), ...failed }));
      announceCreditsChanged();
      o.onMade();
    }
    running.current = false;
    setMaking(false);
  };

  return { making, errors, make };
}
