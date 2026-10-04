'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SLIDESHOW_AFTER, type IdeaAudio, type IdeaDto, type IdeaPatch, type IdeasListDto } from '../../../../types/admin/calendarIdeas';
import { errorOf, type LabClient, type LabResponse } from '../../../labs/labClient';
import { ideasApi } from './ideasApi';

type State = { ideas: IdeaDto[]; slideshowPct: number; reserve: number; loading: boolean; generating: boolean; error: string | null };
type SetState = (fn: (s: State) => State) => void;

/** One swipe, so Undo can put the card back as it was. */
type Step = { id: string; before: IdeaDto['status'] };

/** While a slideshow idea is being made, the list is re-read this often. */
const POLL_MS = 15_000;
const OFFLINE = 'Could not reach the server. Check your connection.';

const byTime = (a: IdeaDto, b: IdeaDto) => a.plannedAt.localeCompare(b.plannedAt);

/**
 * The deck: Blitz ideas first (soonest day first), each ready slideshow after the first SLIDESHOW_AFTER of them, so it
 * has had time to be made. Slideshows still being made wait out of the deck.
 */
export const deckOrder = (waiting: IdeaDto[]): IdeaDto[] => {
  const videos = waiting.filter((i) => i.format === 'blitz');
  const slides = waiting.filter((i) => i.format === 'slideshow' && i.slideshow?.state === 'ready');
  const at = Math.min(SLIDESHOW_AFTER, videos.length);
  return [...videos.slice(0, at), ...slides, ...videos.slice(at)];
};

/** Waiting (in deck order), kept and skipped ideas; slideshows still being made. */
const splitIdeas = (ideas: IdeaDto[]) => {
  const sorted = [...ideas].sort(byTime);
  const waiting = sorted.filter((i) => i.status === 'proposed');
  return {
    deck: deckOrder(waiting),
    making: waiting.filter((i) => i.slideshow?.state === 'making'),
    kept: sorted.filter((i) => i.status === 'kept'),
    skipped: sorted.filter((i) => i.status === 'discarded'),
  };
};

/** Applies a list response, or keeps the error. Returns the list when it worked. */
const useApply = (setState: SetState) =>
  useCallback((res: LabResponse<IdeasListDto> | null): IdeasListDto | null => {
    if (res?.ok) {
      setState((s) => ({ ...s, ideas: res.data.ideas, slideshowPct: res.data.slideshowPct, reserve: res.data.reserve, error: null }));
      return res.data;
    }
    setState((s) => ({ ...s, error: res ? errorOf(res) : OFFLINE }));
    return null;
  }, [setState]);

/** First load; with no ideas yet and a finished run, the first batch is written on its own (free). */
const useLoad = (client: LabClient | null, runId: string, autoGenerate: boolean, setState: SetState) => {
  const apply = useApply(setState);
  const generatedFor = useRef<string | null>(null);
  const generate = useCallback(async () => {
    if (!client) return;
    setState((s) => ({ ...s, generating: true, error: null }));
    apply(await ideasApi.generate(client, runId).catch(() => null));
    setState((s) => ({ ...s, generating: false }));
  }, [client, runId, apply, setState]);

  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    void ideasApi.list(client).catch(() => null).then((res) => {
      if (cancelled) return;
      const data = apply(res);
      setState((s) => ({ ...s, loading: false }));
      if (data && autoGenerate && data.ideas.length === 0 && generatedFor.current !== runId) {
        generatedFor.current = runId;
        void generate();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [client, runId, autoGenerate, apply, generate, setState]);
  return { apply, generate };
};

/** Re-reads the list while a slideshow idea is being made, so it joins the deck once ready. */
const usePoll = (client: LabClient | null, making: number, apply: (res: LabResponse<IdeasListDto> | null) => unknown) => {
  useEffect(() => {
    if (!client || making === 0) return;
    const id = setInterval(() => void ideasApi.list(client).catch(() => null).then((res) => res?.ok && apply(res)), POLL_MS);
    return () => clearInterval(id);
  }, [client, making, apply]);
};

/** Keep, skip, undo, another first line, "+"/"−" on a day: saved as you go (a skipped day gets a fresh idea). */
const useActions = (client: LabClient | null, apply: (res: LabResponse<IdeasListDto> | null) => IdeasListDto | null, setState: SetState) => {
  const [history, setHistory] = useState<Step[]>([]);
  const [focusId, setFocusId] = useState<string | null>(null);
  const patch = useCallback(async (id: string, change: IdeaPatch) => {
    if (!client) return null;
    if (change.status) setState((s) => ({ ...s, ideas: s.ideas.map((i) => (i.id === id ? { ...i, status: change.status! } : i)) }));
    return apply(await ideasApi.patch(client, id, change).catch(() => null));
  }, [client, apply, setState]);
  const decide = useCallback((idea: IdeaDto, status: 'kept' | 'discarded' | 'proposed') => {
    setHistory((h) => [...h, { id: idea.id, before: idea.status }]);
    setFocusId(null);
    void patch(idea.id, { status });
  }, [patch]);
  /** Keeps an idea (on `plannedAt` when given) to be made right away: no undo, it is paid for. True once saved. */
  const keepNow = useCallback(async (idea: IdeaDto, plannedAt?: string) => {
    setFocusId(null);
    return Boolean(await patch(idea.id, plannedAt ? { plannedAt, status: 'kept' } : { status: 'kept' }));
  }, [patch]);
  const undo = useCallback(() => {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    setFocusId(last.id);
    void patch(last.id, { status: last.before === 'made' ? 'proposed' : last.before });
  }, [history, patch]);
  /** A Blitz idea becomes its sibling card, so the focus follows the new id. */
  const pickHook = useCallback(async (idea: IdeaDto, hookId: string) => {
    if (await patch(idea.id, { hookId })) setFocusId(hookId);
  }, [patch]);
  /** Another track for a Blitz idea: plays at once, saved for when it is made. */
  const setMusic = useCallback((idea: IdeaDto, audio: IdeaAudio) => {
    setState((s) => ({ ...s, ideas: s.ideas.map((i) => (i.id === idea.id && i.card ? { ...i, card: { ...i.card, audio } } : i)) }));
    void patch(idea.id, { audio });
  }, [patch, setState]);
  const changeDay = useCallback(async (action: 'add' | 'remove', day: string) => {
    if (!client) return;
    setState((s) => ({ ...s, error: null }));
    apply(await ideasApi.day(client, action, day).catch(() => null));
  }, [client, apply, setState]);
  return { focusId, setFocusId, canUndo: history.length > 0, patch, decide, keepNow, undo, pickHook, setMusic, changeDay };
};

/**
 * The calendar's ideas: the deck (Blitz cards first, real slideshows joining once made), kept and skipped ones, and
 * every action on them. `autoGenerate`: the run is finished, so the first batch can be written.
 */
export function useIdeas(client: LabClient | null, runId: string, autoGenerate: boolean) {
  const [state, setStateRaw] = useState<State>({ ideas: [], slideshowPct: 10, reserve: 0, loading: Boolean(client), generating: false, error: null });
  const setState = useCallback<SetState>((fn) => setStateRaw(fn), []);
  const { apply, generate } = useLoad(client, runId, autoGenerate, setState);
  const actions = useActions(client, apply, setState);
  const lists = useMemo(() => splitIdeas(state.ideas), [state.ideas]);
  usePoll(client, lists.making.length, apply);
  const current = lists.deck.find((i) => i.id === actions.focusId) ?? lists.deck[0] ?? null;
  const reviewSkipped = useCallback(() => lists.skipped.forEach((i) => void actions.patch(i.id, { status: 'proposed' })), [lists.skipped, actions]);
  const reload = useCallback(async () => {
    if (client) apply(await ideasApi.list(client).catch(() => null));
  }, [client, apply]);
  return { ...state, ...lists, ...actions, client, current, generate, reviewSkipped, reload };
}

export type IdeasState = ReturnType<typeof useIdeas>;
