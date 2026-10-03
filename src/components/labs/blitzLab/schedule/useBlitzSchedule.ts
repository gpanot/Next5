'use client';

import { useCallback, useEffect, useState } from 'react';
import { BLITZ_LIVE, type BlitzScheduleDto, type CalendarBusyDto, type ScheduleBlitzRequest } from '../../../../types/admin/blitzSchedule';
import { errorOf } from '../../labClient';
import { useLabClient } from '../../LabClientProvider';
import { scheduleApi } from './scheduleApi';

type State = { items: BlitzScheduleDto[]; busy: CalendarBusyDto[]; loading: boolean; error: string | null };

/** The workspace's scheduled Blitz videos and other calendar posts; schedule and cancel update the list. */
export function useBlitzSchedule() {
  const client = useLabClient();
  const [state, setState] = useState<State>({ items: [], busy: [], loading: true, error: null });

  // Loaded once per deck; schedule and cancel keep it current after that.
  useEffect(() => {
    let cancelled = false;
    scheduleApi.list(client)
      .then((res): Partial<State> => (res.ok ? { items: res.data.items, busy: res.data.busy, error: null } : { error: errorOf(res) }))
      .catch((): Partial<State> => ({ error: 'Could not load the calendar. Check your connection.' }))
      .then((next) => !cancelled && setState((prev) => ({ ...prev, ...next, loading: false })));
    return () => {
      cancelled = true;
    };
  }, [client]);

  /** Resolves to null when scheduled, else the reason it was not. */
  const schedule = useCallback(async (req: ScheduleBlitzRequest): Promise<string | null> => {
    const res = await scheduleApi.create(client, req).catch(() => null);
    if (!res?.ok) return res ? errorOf(res) : 'Could not reach the server. Check your connection.';
    const item = res.data.item;
    setState((prev) => ({ ...prev, items: [...prev.items.filter((i) => i.id !== item.id), item] }));
    return null;
  }, [client]);

  const cancel = useCallback(async (id: string): Promise<string | null> => {
    const res = await scheduleApi.cancel(client, id).catch(() => null);
    if (!res?.ok) return res ? errorOf(res) : 'Could not reach the server. Check your connection.';
    setState((prev) => ({ ...prev, items: prev.items.filter((i) => i.id !== id) }));
    return null;
  }, [client]);

  /** The live calendar post made from this card, if any. */
  const itemFor = useCallback(
    (cardId: string) => state.items.find((i) => i.cardId === cardId && BLITZ_LIVE.includes(i.status)) ?? null,
    [state.items],
  );

  return { ...state, schedule, cancel, itemFor };
}

export type BlitzSchedule = ReturnType<typeof useBlitzSchedule>;
