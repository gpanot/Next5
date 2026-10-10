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

/**
 * Every request answers with the whole list, and fast swipes overlap: skip #1's answer was read before skip #2 was
 * saved, so it showed card #2 back in the deck (then skip #2's answer skipped it again). Statuses sent and not answered
 * yet are laid over every list, and each request takes a ticket when sent, so an answer older than the one shown is
 * dropped.
 */
export class ListSync {
  private pending = new Map<string, IdeaDto['status']>();
  private sent = 0;
  private applied = 0;

  /** A ticket for a request about to be sent. */
  take(): number {
    return ++this.sent;
  }

  /** True when a newer answer is already shown; else `ticket` becomes the one shown. */
  stale(ticket: number): boolean {
    if (ticket < this.applied) return true;
    this.applied = ticket;
    return false;
  }

  /** A status sent to the server and not answered yet. */
  hold(id: string, status: IdeaDto['status']): void {
    this.pending.set(id, status);
  }

  /** Answered: the server's lists say it from now on, unless a later swipe changed it again. */
  release(id: string, status: IdeaDto['status']): void {
    if (this.pending.get(id) === status) this.pending.delete(id);
  }

  /** The list with the statuses still being saved. */
  overlay(ideas: IdeaDto[]): IdeaDto[] {
    return ideas.map((i) => (this.pending.has(i.id) ? { ...i, status: this.pending.get(i.id)! } : i));
  }
}

/** Sends a request that answers with the list and applies it in order. `quiet`: a failure keeps the error unchanged. */
export type ListRequest = (call: () => Promise<LabResponse<IdeasListDto>>, quiet?: boolean) => Promise<IdeasListDto | null>;

/** `request` for the hooks below: applies each list answer (statuses still being saved laid over it), or keeps the error. */
const useRequest = (setState: SetState, made: MadeIds, sync: ListSync): ListRequest =>
  useCallback(async (call, quiet = false) => {
    const ticket = sync.take();
    const res = await call().catch(() => null);
    if (res?.ok) {
      if (sync.stale(ticket)) return res.data;
      const ideas = sync.overlay(res.data.ideas.filter((i) => !made.current.has(i.id)));
      setState((s) => ({ ...s, ideas, slideshowPct: res.data.slideshowPct, reserve: res.data.reserve, batchSince: res.data.batchSince, error: null }));
      return res.data;
    }
    if (!quiet) setState((s) => ({ ...s, error: res ? errorOf(res) : OFFLINE }));
    return null;
  }, [setState, made, sync]);

/** First load; with no ideas yet and a finished run, the first batch is written on its own (free). The server usually
 *  writes it already: then the list says so (`batchSince`) and the batch is waited for instead. */
const useLoad = (client: LabClient | null, runId: string, autoGenerate: boolean, setState: SetState, request: ListRequest) => {
  const generatedFor = useRef<string | null>(null);
  const generate = useCallback(async () => {
    if (!client) return;
    setState((s) => ({ ...s, generating: true, generatingSince: new Date().toISOString(), error: null }));
    await request(() => ideasApi.generate(client, runId));
    setState((s) => ({ ...s, generating: false, generatingSince: null }));
  }, [client, runId, request, setState]);

  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    void request(() => ideasApi.list(client)).then((data) => {
      if (cancelled) return;
      setState((s) => ({ ...s, loading: false }));
      if (data && autoGenerate && data.ideas.length === 0 && !data.batchSince && generatedFor.current !== runId) {
        generatedFor.current = runId;
        void generate();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [client, runId, autoGenerate, request, generate, setState]);
  return { generate };
};

/** Re-reads the list while a slideshow idea or a batch is being made, so they join the deck once ready, and while a
 *  batch's cards are being finished (their AI images and caption heights land). */
const usePoll = (client: LabClient | null, busy: boolean, request: ListRequest) => {
  useEffect(() => {
    if (!client || !busy) return;
    const id = setInterval(() => void request(() => ideasApi.list(client), true), POLL_MS);
    return () => clearInterval(id);
  }, [client, busy, request]);
};

/** Keep, skip, undo, another first line, "+"/"−" on a day: saved as you go (a skipped day gets a fresh idea). */
const useActions = (client: LabClient | null, request: ListRequest, setState: SetState, sync: ListSync) => {
  const [history, setHistory] = useState<Step[]>([]);
  const [focusId, setFocusId] = useState<string | null>(null);
  const patch = useCallback(async (id: string, change: IdeaPatch) => {
    if (!client) return null;
    const status = change.status;
    if (status) {
      sync.hold(id, status);
      setState((s) => ({ ...s, ideas: s.ideas.map((i) => (i.id === id ? { ...i, status } : i)) }));
    }
    try {
      return await request(() => ideasApi.patch(client, id, change));
    } finally {
      if (status) sync.release(id, status);
    }
  }, [client, request, setState, sync]);
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
    await request(() => ideasApi.day(client, action, day));
  }, [client, request, setState]);
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
  const [sync] = useState(() => new ListSync());
  const request = useRequest(setState, made, sync);
  const { generate } = useLoad(client, runId, autoGenerate, setState, request);
  const actions = useActions(client, request, setState, sync);
  const [filter, setFilter] = useState<IdeaFilter>('all');
  const everyList = useMemo(() => splitIdeas(state.ideas), [state.ideas]);
  const lists = useMemo(() => (filter === 'all' ? everyList : onlyFormat(everyList, filter)), [everyList, filter]);
  /** Ideas left to swipe, per filter chip. */
  const counts = useMemo<Record<IdeaFilter, number>>(() => {
    const blitz = everyList.deck.filter((i) => i.format === 'blitz').length;
    return { all: everyList.deck.length, blitz, slideshow: everyList.deck.length - blitz };
  }, [everyList.deck]);
  const finishing = everyList.deck.some((i) => i.card?.finishing);
  usePoll(client, everyList.making.length > 0 || Boolean(state.batchSince) || finishing, request);
  const current = lists.deck.find((i) => i.id === actions.focusId) ?? lists.deck[0] ?? null;
  const reviewSkipped = useCallback(() => lists.skipped.forEach((i) => void actions.patch(i.id, { status: 'proposed' })), [lists.skipped, actions]);
  /** Made into posts: off the deck and the day lists at once (they become calendar posts). */
  const markMade = useCallback((ids: string[]) => {
    ids.forEach((id) => made.current.add(id));
    setState((s) => ({ ...s, ideas: s.ideas.filter((i) => !made.current.has(i.id)) }));
  }, [setState]);
  const reload = useCallback(async () => {
    if (client) await request(() => ideasApi.list(client));
  }, [client, request]);
  /** "Create 3 slideshows": null once started, else the reason (shown in the dialog, not over the deck). */
  const createSlideshows = useCallback(async (): Promise<string | null> => {
    if (!client) return OFFLINE;
    let failed: string | null = null;
    const list = await request(async () => {
      const res = await ideasApi.createSlideshows(client, runId);
      if (!res.ok) failed = errorOf(res);
      return res;
    }, true);
    return list ? null : (failed ?? OFFLINE);
  }, [client, runId, request]);
  const generating = state.generating || Boolean(state.batchSince);
  const generatingSince = state.generatingSince ?? state.batchSince;
  return { ...state, generating, generatingSince, ...lists, ...actions, filter, setFilter, counts, client, current, generate, reviewSkipped, reload, markMade, createSlideshows };
}

export type IdeasState = ReturnType<typeof useIdeas>;
