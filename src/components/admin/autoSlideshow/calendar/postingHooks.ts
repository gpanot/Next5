'use client';

import { useEffect, useState } from 'react';
import type { AutoRunDto } from '../../../../types/admin/autoSlideshow';
import { adminFetch } from '../../business/useAdminApi';
import { addMonths, monthOf, monthRange } from './monthPlan';

/** Seconds between re-checks while a post is due or publishing: the server then sends it or asks the platform how it went. */
const WATCH_MS = 20_000;

/** True while a post is on its way: sending, publishing, or scheduled for now. */
const postsMoving = (run: AutoRunDto, now = Date.now()) =>
  run.slideshows.some((s) => s.posts.some((p) => p.status === 'sending' || p.status === 'processing' || (p.status === 'scheduled' && new Date(p.scheduledAt).getTime() <= now)));

/** Reloads the run every 20 s while posts are moving, so "Publishing" turns into "Posted" without a page refresh. */
export const useWatchPosts = (run: AutoRunDto, onRunChanged: () => void) => {
  const moving = postsMoving(run);
  useEffect(() => {
    if (!moving) return;
    const id = setInterval(onRunChanged, WATCH_MS);
    return () => clearInterval(id);
  }, [moving, onRunChanged]);
};

/** Adds slideshows to the run ("Get more"); the new ones land on the next empty days. */
export const useAdd = (token: string, runId: string, onRunChanged: () => void) => {
  const [adding, setAdding] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const add = async (count: number) => {
    setAdding(count);
    setError(null);
    try {
      await adminFetch(token, `/api/admin/auto-slideshow/runs/${runId}/more`, { method: 'POST', body: JSON.stringify({ count }) });
      onRunChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add');
    }
    setAdding(null);
  };
  return { adding, error, add };
};

/** The month shown: starts on tomorrow's month (on the last day of a month, the next one); arrows move it. */
export const useMonth = (run: AutoRunDto) => {
  const [month, setMonth] = useState(() => monthOf(new Date(Date.now() + 86_400_000)));
  const range = monthRange(run.slideshows);
  const step = (n: -1 | 1) => setMonth((m) => addMonths(m, n));
  return { month, step, canPrev: month > range.min, canNext: month < range.max };
};
