'use client';

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { ApiError } from '../../../lib/apiClient';
import type { BlueprintDto, BlueprintPatch } from '../../../lib/blueprint/schema';
import { patchBlueprint } from './api';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/** Edits waiting to be sent. Topics and About go whole; days only with the fields that changed. */
export type Pending = Omit<BlueprintPatch, 'version'>;

const SAVE_DELAY_MS = 600;

const isEmpty = (p: Pending): boolean => Object.keys(p).length === 0;

export const mergePending = (a: Pending, b: Pending): Pending => {
  const days = { ...a.days };
  for (const [key, patch] of Object.entries(b.days ?? {})) days[key] = { ...days[key], ...patch };
  return { ...a, ...b, ...(Object.keys(days).length ? { days } : {}) };
};

const conflictBlueprint = (err: unknown): BlueprintDto | null =>
  err instanceof ApiError && err.code === 'version_conflict' ? ((err.details?.blueprint as BlueprintDto | undefined) ?? null) : null;

type Callbacks = {
  /**
   * The server copy to show. 'reset': after a reset. 'merged': something else saved first, `unsent` holds the edits to
   * keep on top. 'replaced': conflicts kept coming, the server copy wins.
   */
  onServerCopy: (bp: BlueprintDto, mode: 'reset' | 'merged' | 'replaced', unsent?: Pending) => void;
};

/** A conflict re-sends the edits on top of the newer copy; more than this many in a row gives up and shows the server copy. */
const MAX_CONFLICT_RETRIES = 2;

/** Debounced PATCH with the stored version. One request at a time; edits made meanwhile go in the next one. */
export const useAutosave = (token: string, versionRef: MutableRefObject<number>, { onServerCopy }: Callbacks) => {
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const pending = useRef<Pending>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);
  const flushRef = useRef<() => Promise<void>>(async () => undefined);
  const conflicts = useRef(0);

  const send = useCallback(
    async (patch: Pending) => {
      setSaveState('saving');
      try {
        const bp = await patchBlueprint(token, { ...patch, version: versionRef.current });
        versionRef.current = bp.version;
        conflicts.current = 0;
        if (patch.reset) onServerCopy(bp, 'reset');
        setSaveState(isEmpty(pending.current) ? 'saved' : 'saving');
      } catch (err) {
        const latest = conflictBlueprint(err);
        if (!latest) {
          pending.current = mergePending(patch, pending.current);
          setSaveState('error');
          return;
        }
        versionRef.current = latest.version;
        conflicts.current += 1;
        if (conflicts.current > MAX_CONFLICT_RETRIES || patch.reset) {
          pending.current = {};
          onServerCopy(latest, 'replaced');
          setSaveState('saved');
          return;
        }
        // Usually a script finished saving while the user typed: keep their edits on top of the newer copy.
        const unsent = mergePending(patch, pending.current);
        pending.current = unsent;
        onServerCopy(latest, 'merged', unsent);
        void Promise.resolve().then(() => flushRef.current());
      }
    },
    [token, versionRef, onServerCopy],
  );

  const flush = useCallback(async (): Promise<void> => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (inFlight.current) await inFlight.current;
    const patch = pending.current;
    if (isEmpty(patch)) return;
    pending.current = {};
    inFlight.current = send(patch).finally(() => {
      inFlight.current = null;
    });
    await inFlight.current;
  }, [send]);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const queue = useCallback((patch: Pending) => {
    pending.current = mergePending(pending.current, patch);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flushRef.current(), SAVE_DELAY_MS);
  }, []);

  // Send what is left when the page closes.
  useEffect(() => () => void flushRef.current(), []);

  return { saveState, queue, flush };
};
