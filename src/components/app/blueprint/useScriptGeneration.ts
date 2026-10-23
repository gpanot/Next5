'use client';

import { useCallback, useRef, useState } from 'react';
import { ApiError } from '../../../lib/apiClient';
import type { BlueprintDto } from '../../../lib/blueprint/schema';
import type { HookOption, ScriptHook } from '../../../lib/scriptGenerator/types';
import { changeScript, hookOptions, writeScript } from './api';
import { ERROR_COPY, SCRIPT_UI } from './planCopy';

export type DayBusy = 'writing' | 'changing' | 'hooks' | null;

export type DayRun = { busy: DayBusy; error: string | null; message: string | null; hooks: HookOption[] | null };

const IDLE: DayRun = { busy: null, error: null, message: null, hooks: null };

const errorText = (err: unknown): string => {
  if (!(err instanceof ApiError)) return 'Something went wrong. Try again.';
  if (err.code === 'rate_limited') {
    const minutes = Math.ceil(Number(err.details?.retryAfterSec ?? 0) / 60);
    return minutes > 0 ? `${ERROR_COPY.rate_limited} (about ${minutes} min)` : ERROR_COPY.rate_limited;
  }
  return ERROR_COPY[err.code] ?? err.message;
};

type Options = {
  token: string;
  /** Saves pending edits first, so the server writes from what is on screen. */
  flush: () => Promise<void>;
  onSaved: (bp: BlueprintDto, day: number) => void;
};

/** Write, change and hook calls per day, each with its own progress, Stop and error. */
export const useScriptGeneration = ({ token, flush, onSaved }: Options) => {
  const [runs, setRuns] = useState<Record<number, DayRun>>({});
  const controllers = useRef<Record<number, AbortController>>({});

  const patch = useCallback((day: number, next: Partial<DayRun>) => setRuns((r) => ({ ...r, [day]: { ...IDLE, ...r[day], ...next } })), []);

  const run = useCallback(
    async <T>(day: number, busy: DayBusy, call: (signal: AbortSignal) => Promise<T>, done: (out: T) => Partial<DayRun>) => {
      if (controllers.current[day]) return;
      const controller = new AbortController();
      controllers.current[day] = controller;
      patch(day, { busy, error: null, message: null });
      try {
        await flush();
        const out = await call(controller.signal);
        patch(day, { busy: null, ...done(out) });
      } catch (err) {
        patch(day, { busy: null, error: controller.signal.aborted ? SCRIPT_UI.stopped : errorText(err) });
      } finally {
        delete controllers.current[day];
      }
    },
    [flush, patch],
  );

  const write = useCallback(
    (day: number, hook?: ScriptHook) =>
      run(day, 'writing', (signal) => writeScript(token, day, hook, signal), (out) => {
        onSaved(out.blueprint, day);
        return { hooks: null };
      }),
    [run, token, onSaved],
  );

  const change = useCallback(
    (day: number, instruction: string) =>
      run(day, 'changing', (signal) => changeScript(token, day, instruction, signal), (out) => {
        if (!out.refused) onSaved(out.blueprint, day);
        return { message: out.message || null };
      }),
    [run, token, onSaved],
  );

  const loadHooks = useCallback(
    (day: number) => run(day, 'hooks', (signal) => hookOptions(token, day, signal), (hooks) => ({ hooks })),
    [run, token],
  );

  const stop = useCallback((day: number) => controllers.current[day]?.abort(), []);
  const hideHooks = useCallback((day: number) => patch(day, { hooks: null }), [patch]);

  return { runOf: (day: number): DayRun => runs[day] ?? IDLE, write, change, loadHooks, stop, hideHooks };
};
