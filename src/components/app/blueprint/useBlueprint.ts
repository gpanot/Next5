'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../../../lib/apiClient';
import { applyDayPatch, type About, type BlueprintDto, type DayPatch, type Topics } from '../../../lib/blueprint/schema';
import { getBlueprint } from './api';
import { useAutosave, type Pending } from './useAutosave';

const CONFLICT_NOTICE = 'Your blueprint changed somewhere else, so we loaded the latest saved version.';

/** The server copy with the user's unsent edits laid on top, so nothing they typed disappears. */
const withUnsent = (bp: BlueprintDto, unsent: Pending): BlueprintDto => ({
  ...bp,
  ...(unsent.topics ? { topics: unsent.topics } : {}),
  ...(unsent.about ? { about: unsent.about } : {}),
  ...(unsent.step !== undefined ? { step: unsent.step } : {}),
  plan: bp.plan.map((day, i) => {
    const patch = unsent.days?.[String(i)];
    return patch ? applyDayPatch(day, patch) : day;
  }),
});

/** Loads the admin blueprint. */
const useBlueprintLoad = (token: string) => {
  const [blueprint, setBlueprint] = useState<BlueprintDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const versionRef = useRef(0);

  const fetchBlueprint = useCallback(() => {
    getBlueprint(token)
      .then((bp) => {
        versionRef.current = bp.version;
        setBlueprint(bp);
      })
      .catch((err: unknown) => setLoadError(err instanceof ApiError ? err.message : 'We could not load your blueprint.'));
  }, [token]);

  useEffect(fetchBlueprint, [fetchBlueprint]);

  const load = useCallback(() => {
    setLoadError(null);
    fetchBlueprint();
  }, [fetchBlueprint]);
  return { blueprint, setBlueprint, loadError, load, versionRef };
};

/** The blueprint plus edits that show at once and autosave in the background. */
export const useBlueprint = (token: string) => {
  const { blueprint, setBlueprint, loadError, load, versionRef } = useBlueprintLoad(token);
  const [notice, setNotice] = useState<string | null>(null);

  const onServerCopy = useCallback(
    (bp: BlueprintDto, mode: 'reset' | 'merged' | 'replaced', unsent?: Pending) => {
      setBlueprint(unsent ? withUnsent(bp, unsent) : bp);
      if (mode === 'replaced') setNotice(CONFLICT_NOTICE);
    },
    [setBlueprint],
  );
  const { saveState, queue, flush } = useAutosave(token, versionRef, { onServerCopy });

  const edit = useCallback(
    (patch: Pending, apply: (bp: BlueprintDto) => BlueprintDto) => {
      setBlueprint((bp) => (bp ? apply(bp) : bp));
      queue(patch);
    },
    [queue, setBlueprint],
  );

  const setTopics = useCallback((topics: Topics) => edit({ topics }, (bp) => ({ ...bp, topics })), [edit]);
  const setAbout = useCallback((about: About) => edit({ about }, (bp) => ({ ...bp, about })), [edit]);
  const setStep = useCallback((step: number) => edit({ step }, (bp) => ({ ...bp, step })), [edit]);
  const setDay = useCallback(
    (index: number, patch: DayPatch) =>
      edit({ days: { [String(index)]: patch } }, (bp) => ({
        ...bp,
        plan: bp.plan.map((day, i) => (i === index ? applyDayPatch(day, patch) : day)),
      })),
    [edit],
  );
  const reset = useCallback(() => {
    queue({ reset: true });
    return flush();
  }, [queue, flush]);

  /** A script route saved one day on the server: take that day and the new version. */
  const acceptServerDay = useCallback(
    (bp: BlueprintDto, dayIndex: number) => {
      versionRef.current = bp.version;
      setBlueprint((cur) => (cur ? { ...cur, version: bp.version, plan: cur.plan.map((d, i) => (i === dayIndex ? bp.plan[i] : d)) } : bp));
    },
    [setBlueprint, versionRef],
  );

  return {
    blueprint,
    loading: !blueprint && !loadError,
    loadError,
    retryLoad: load,
    saveState,
    flush,
    notice,
    clearNotice: () => setNotice(null),
    setTopics,
    setAbout,
    setStep,
    setDay,
    reset,
    acceptServerDay,
  };
};
