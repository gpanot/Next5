'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { pickHookCtaStyle } from '../../../../remotion/slideTextConfig';
import type { HookCtaStyle } from '../../../../remotion/types';
import { CAPTION_STYLES, type CaptionStyleDef } from '../../../labs/blitzLab/captionStyles';

const KEY = 'next5.ideas.hookStyle';

/** The looks the deck's Hook button offers, in this order. "Default": the hook looks like the other slides. */
const HOOK_STYLE_IDS = ['default', 'white-box', 'tiktok-red'] as const;
export type HookStyleId = (typeof HOOK_STYLE_IDS)[number];

const LABELS: Record<HookStyleId, string> = { default: 'Default', 'white-box': 'White box', 'tiktok-red': 'TikTok Red' };

export const HOOK_STYLES: Array<CaptionStyleDef & { id: HookStyleId }> = HOOK_STYLE_IDS.map((id) => {
  const style = CAPTION_STYLES.find((s) => s.id === id)!;
  return { ...style, id, label: LABELS[id] };
});

const isHookStyleId = (v: string | null): v is HookStyleId => HOOK_STYLE_IDS.some((id) => id === v);

/** The hook / CTA look sent with the caption: none for "Default", so they match the other slides. */
export const hookCtaOf = (id: HookStyleId): HookCtaStyle | undefined => {
  if (id === 'default') return undefined;
  return pickHookCtaStyle(HOOK_STYLES.find((s) => s.id === id)!.patch);
};

/** How long the card shows "loading" after a pick, so the change is seen (an instant swap is missed). */
const APPLY_MS = 1500;

const savedId = (): HookStyleId => {
  try {
    const saved = typeof window === 'undefined' ? null : window.localStorage.getItem(KEY);
    return isHookStyleId(saved) ? saved : 'default';
  } catch { return 'default'; }
};

/**
 * The deck's hook look (first and last slide), for every Blitz idea, remembered per browser (storage may be unavailable).
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
  const hookCta = useMemo(() => hookCtaOf(applied), [applied]);
  return { id, set, hookCta, pending: id !== applied, version };
}

export type HookStyleState = ReturnType<typeof useHookStyle>;
