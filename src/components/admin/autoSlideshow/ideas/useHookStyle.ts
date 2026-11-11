'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isHookStyleId, type HookStyleId } from '../../../labs/blitzLab/hookStyles';
import { isHookTitleStyleId, type HookTitleStyleId } from '../../../../types/hookStyle';

const KEY = 'next5.ideas.hookStyle';

/** How long the card shows "loading" after a pick, so the change is seen (an instant swap is missed). */
const APPLY_MS = 1500;

const savedId = (): HookStyleId => {
  try {
    const saved = typeof window === 'undefined' ? null : window.localStorage.getItem(KEY);
    return isHookStyleId(saved) ? saved : 'default';
  } catch { return 'default'; }
};

/**
 * The deck's hook title look for every Blitz idea, remembered per browser (storage may be unavailable). "Default" (shown
 * as "Auto") keeps each card's own look, picked for its photo (server/labs/hookTitle.ts); the others replace it.
 * A pick shows as `pending` for APPLY_MS, then applies; `version` then changes, so the card restarts from its first slide.
 */
export function useHookStyle() {
  const [id, setId] = useState<HookStyleId>(savedId);
  const [applied, setApplied] = useState<HookStyleId>(id);
  const [version, setVersion] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const set = useCallback((next: HookStyleId) => {
    setId(next);
    try { window.localStorage.setItem(KEY, next); } catch { /* private mode */ }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setApplied(next);
      setVersion((v) => v + 1);
    }, APPLY_MS);
  }, []);
  const titleStyle = useMemo((): HookTitleStyleId | null => (isHookTitleStyleId(applied) ? applied : null), [applied]);
  return { id, set, titleStyle, pending: id !== applied, version };
}

export type HookStyleState = ReturnType<typeof useHookStyle>;
