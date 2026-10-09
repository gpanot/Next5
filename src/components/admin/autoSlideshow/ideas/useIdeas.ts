'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SLIDESHOW_AFTER, type IdeaAudio, type IdeaDto, type IdeaFormat, type IdeaPatch, type IdeasListDto } from '../../../../types/admin/calendarIdeas';
import { errorOf, type LabClient, type LabResponse } from '../../../labs/labClient';
import { ideasApi } from './ideasApi';

/** `generatingSince`: when the batch being written was asked for (ISO), for the countdown on the empty card.
 *  `batchSince`: a batch written elsewhere (the server's first one, after the first run), from the list. */
type State = { ideas: IdeaDto[]; slideshowPct: number; reserve: number; loading: boolean; generating: boolean; generatingSince: string | null; batchSince: string | null; error: string | null };
type SetState = (fn: (s: State) => State) => void;

/** One swipe, so Undo can put the card back as it was. */
type Step = { id: string; before: IdeaDto['status'] };

/** While a slideshow idea is being made, the list is re-read this often. */
const POLL_MS = 15_000;
const OFFLINE = 'Could not reach the server. Check your connection.';

const byTime = (a: IdeaDto, b: IdeaDto) => a.plannedAt.localeCompare(b.plannedAt);

/**
 * The deck: slideshows the user asked for ("Create 3 slideshows") first, then Blitz ideas (soonest day first), each
 * other ready slideshow after the first SLIDESHOW_AFTER of them, so it has had time to be made. Slideshows still being
 * made wait out of the deck.
 */
export const deckOrder = (waiting: IdeaDto[]): IdeaDto[] => {
  const videos = waiting.filter((i) => i.format === 'blitz');
  const ready = waiting.filter((i) => i.format === 'slideshow' && i.slideshow?.state === 'ready');
  const asked = ready.filter((i) => i.requested);
  const slides = ready.filter((i) => !i.requested);
  const at = Math.min(SLIDESHOW_AFTER, videos.length);
  return [...asked, ...videos.slice(0, at), ...slides, ...videos.slice(at)];
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

type Lists = ReturnType<typeof splitIdeas>;

/** The Ideas page's filter: every idea, or one format. */
export type IdeaFilter = 'all' | IdeaFormat;

/** The lists of one format only (the deck keeps its order). */
const onlyFormat = (lists: Lists, format: IdeaFormat): Lists => {
  const keep = (list: IdeaDto[]) => list.filter((i) => i.format === format);
  return { deck: keep(lists.deck), making: keep(lists.making), kept: keep(lists.kept), skipped: keep(lists.skipped) };
};

/** Ideas made into posts in this session: left out of every list, so an older response can't show them as kept again. */
type MadeIds = { current: Set<string> };

/** Applies a list response, or keeps the error. Returns the list when it worked. */
const useApply = (setState: SetState, made: MadeIds) =>
  useCallback((res: LabResponse<IdeasListDto> | null): IdeasListDto | null => {
    if (res?.ok) {
      const ideas = res.data.ideas.filter((i) => !made.current.has(i.id));
      setState((s) => ({ ...s, ideas, slideshowPct: res.data.slideshowPct, reserve: res.data.reserve, batchSince: res.data.batchSince, error: null }));
      return res.data;
    }
    setState((s) => ({ ...s, error: res ? errorOf(res) : OFFLINE }));
    return null;
  }, [setState, made]);

/** First load; with no ideas yet and a finished run, the first batch is written on its own (free). The server usually
 *  writes it already: then the list says so (`batchSince`) and the batch is waited for instead. */
const useLoad = (client: LabClient | null, runId: string, autoGenerate: boolean, setState: SetState, made: MadeIds) => {
  const apply = useApply(setState, made);
  const generatedFor = useRef<string | null>(null);
  const generate = useCallback(async () => {
    if (!client) return;
    setState((s) => ({ ...s, generating: true, generatingSince: new Date().toISOString(), error: null }));
    apply(await ideasApi.generate(client, runId).catch(() => null));
    setState((s) => ({ ...s, generating: false, generatingSince: null }));
  }, [client, runId, apply, setState]);

  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    void ideasApi.list(client).catch(() => null).then((res) => {
      if (cancelled) return;
      const data = apply(res);
      setState((s) => ({ ...s, loading: false }));
      if (data && autoGenerate && data.ideas.length === 0 && !data.batchSince && generatedFor.current !== runId) {
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

/** Re-reads the list while a slideshow idea or a batch is being made, so they join the deck once ready. */
const usePoll = (client: LabClient | null, busy: boolean, apply: (res: LabResponse<IdeasListDto> | null) => unknown) => {
  useEffect(() => {
    if (!client || !busy) return;
    const id = setInterval(() => void ideasApi.list(client).catch(() => null).then((res) => res?.ok && apply(res)), POLL_MS);
    return () => clearInterval(id);
  }, [client, busy, apply]);
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
 * The workspace's ideas: the deck (Blitz cards first, real slideshows joining once made), kept and skipped ones, and
 * every action on them. `filter` narrows every list to one format (the Ideas page's chips); `counts` stay unfiltered. `autoGenerate`: the run is finished, so the first batch can be written.
 */
export function useIdeas(client: LabClient | null, runId: string, autoGenerate: boolean) {
  const [state, setStateRaw] = useState<State>({ ideas: [], slideshowPct: 10, reserve: 0, loading: Boolean(client), generating: false, generatingSince: null, batchSince: null, error: null });
  const setState = useCallback<SetState>((fn) => setStateRaw(fn), []);
  const made = useRef(new Set<string>());
  const { apply, generate } = useLoad(client, runId, autoGenerate, setState, made);
  const actions = useActions(client, apply, setState);
  const [filter, setFilter] = useState<IdeaFilter>('all');
  const everyList = useMemo(() => splitIdeas(state.ideas), [state.ideas]);
  const lists = useMemo(() => (filter === 'all' ? everyList : onlyFormat(everyList, filter)), [everyList, filter]);
  /** Ideas left to swipe, per filter chip. */
  const counts = useMemo<Record<IdeaFilter, number>>(() => {
    const blitz = everyList.deck.filter((i) => i.format === 'blitz').length;
    return { all: everyList.deck.length, blitz, slideshow: everyList.deck.length - blitz };
  }, [everyList.deck]);
  usePoll(client, everyList.making.length > 0 || Boolean(state.batchSince), apply);
  const current = lists.deck.find((i) => i.id === actions.focusId) ?? lists.deck[0] ?? null;
  const reviewSkipped = useCallback(() => lists.skipped.forEach((i) => void actions.patch(i.id, { status: 'proposed' })), [lists.skipped, actions]);
  /** Made into posts: off the deck and the day lists at once (they become calendar posts). */
  const markMade = useCallback((ids: string[]) => {
    ids.forEach((id) => made.current.add(id));
    setState((s) => ({ ...s, ideas: s.ideas.filter((i) => !made.current.has(i.id)) }));
  }, [setState]);
  const reload = useCallback(async () => {
    if (client) apply(await ideasApi.list(client).catch(() => null));
  }, [client, apply]);
  /** "Create 3 slideshows": null once started, else the reason (shown in the dialog, not over the deck). */
  const createSlideshows = useCallback(async (): Promise<string | null> => {
    if (!client) return OFFLINE;
    const res = await ideasApi.createSlideshows(client, runId).catch(() => null);
    if (!res?.ok) return res ? errorOf(res) : OFFLINE;
    apply(res);
    return null;
  }, [client, runId, apply]);
  const generating = state.generating || Boolean(state.batchSince);
  const generatingSince = state.generatingSince ?? state.batchSince;
  return { ...state, generating, generatingSince, ...lists, ...actions, filter, setFilter, counts, client, current, generate, reviewSkipped, reload, markMade, createSlideshows };
}

export type IdeasState = ReturnType<typeof useIdeas>;
