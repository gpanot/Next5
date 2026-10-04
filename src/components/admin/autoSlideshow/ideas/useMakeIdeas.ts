'use client';

import { useState } from 'react';
import type { IdeaDto } from '../../../../types/admin/calendarIdeas';
import { deckRenderBody, type RenderBodyContext } from '../../../labs/blitzLab/deckRenderBody';
import { scheduleApi } from '../../../labs/blitzLab/schedule/scheduleApi';
import { toSlide } from '../../../labs/blitzLab/useDeckCardEditor';
import { errorOf, type LabClient } from '../../../labs/labClient';
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

/**
 * "Make N": kept ideas become posts on their days. Videos are scheduled one by one (each its own credit); slideshows
 * (made while the user swiped) move into the run, each charged as it moves. Failed ones stay kept, with the reason, so Make can be tapped again.
 */
export function useMakeIdeas(o: Options) {
  const [making, setMaking] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const make = async (kept: IdeaDto[]) => {
    if (!o.client || making || kept.length === 0) return;
    setMaking(true);
    const next: Record<string, string> = {};
    Object.assign(next, await makeSlideshows(o.client, o, kept.filter((i) => i.format === 'slideshow')));
    const videos = kept.filter((i) => i.format === 'blitz');
    const ctx = videos.length > 0 ? await loadRenderContext(o.client).catch((err: unknown) => (err instanceof Error ? err.message : 'Could not load the video template.')) : null;
    for (const idea of videos) {
      const error = typeof ctx === 'string' ? ctx : ctx ? await scheduleBlitz(o.client, ctx, idea) : null;
      if (error) next[idea.id] = error;
    }
    setErrors(next);
    setMaking(false);
    o.onMade();
  };

  return { making, errors, make };
}
