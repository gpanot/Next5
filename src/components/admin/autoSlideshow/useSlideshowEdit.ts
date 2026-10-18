'use client';

import { useCallback, useRef, useState } from 'react';
import type { AutoSlideshowDto } from '../../../types/admin/autoSlideshow';
import type { HookStyleId } from '../../../types/hookStyle';
import type { SlideLook, TextAt } from '../../../types/slideText';
import { adminFetch } from '../business/useAdminApi';

type Response = { slideshow: AutoSlideshowDto };

/**
 * The slideshow being edited and every edit call. Each call returns the saved slideshow, which replaces the local copy;
 * `busy` names the running action so its button can show progress while the others wait. Live edits (text dragged or
 * restyled on the slide) run in the background, one after the other, with no busy state; other calls wait for them, so
 * no two writes of the slides overlap.
 */
export const useSlideshowEdit = (token: string, runId: string, initial: AutoSlideshowDto, onChanged: () => void) => {
  const [show, setShow] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const base = `/api/admin/auto-slideshow/runs/${runId}/slideshows/${initial.id}`;
  const line = useRef<Promise<unknown>>(Promise.resolve());

  /** A background edit, after the ones before it: the saved slideshow, or null when it failed (with the error shown). */
  const quiet = (path: string, body: unknown, failure: string): Promise<AutoSlideshowDto | null> => {
    const run = line.current.then(async () => {
      try {
        const res = await adminFetch<Response>(token, `${base}${path}`, { method: 'PATCH', body: JSON.stringify(body) });
        setShow(res.slideshow);
        onChanged();
        return res.slideshow;
      } catch (err) {
        setError(err instanceof Error ? err.message : failure);
        return null;
      }
    });
    line.current = run;
    return run;
  };

  const call = useCallback(
    async (label: string, path: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown): Promise<boolean> => {
      setBusy(label);
      setError(null);
      await line.current;
      try {
        const res = await adminFetch<Response>(token, `${base}${path}`, { method, ...(method === 'DELETE' ? {} : { body: JSON.stringify(body ?? {}) }) });
        if (res.slideshow) setShow(res.slideshow);
        onChanged();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
        return false;
      } finally {
        setBusy(null);
      }
    },
    [token, base, onChanged],
  );

  return {
    show,
    busy,
    error,
    /** Text dragged on a slide (and the locked content slides with it), saved and rendered in the background. */
    placeText: (index: number, at: TextAt) => quiet('', { textMove: { index, at } }, 'The text could not be moved'),
    /** A content slide's text unlocked from the others or locked back: shown at once, saved in the background. */
    setTextFree: (index: number, textFree: boolean) => {
      setShow((s) => ({ ...s, slides: s.slides.map((slide, i) => (i === index ? { ...slide, textFree: textFree || undefined } : slide)) }));
      void quiet(`/slides/${index}`, { textFree }, 'The text lock could not be saved');
    },
    /** One text style (headline or the line under it) on every hook, content or CTA slide, in the background. */
    styleText: (group: 'hook' | 'content' | 'cta', part: 'look' | 'bodyLook', look: SlideLook) =>
      quiet('', { textStyle: { group, part, look } }, 'The text style could not be saved'),
    saveSlide: (index: number, patch: { title?: string; body?: string; photoIndex?: number; textAt?: null }) => call(`slide-${index}`, `/slides/${index}`, 'PATCH', patch),
    deleteSlide: (index: number) => call(`delete-slide-${index}`, `/slides/${index}`, 'DELETE'),
    newPhoto: (index: number) => call(`photo-${index}`, `/slides/${index}/photo`, 'POST'),
    saveCaption: (caption: string, hashtags: string[]) => call('caption', '', 'PATCH', { caption, hashtags }),
    setMusic: (audioAssetId: string | null) => call('music', '', 'PATCH', { audioAssetId }),
    setHookStyle: (hookStyle: HookStyleId) => call('hook-style', '', 'PATCH', { hookStyle }),
    regenerate: () => call('regenerate', '/regenerate', 'POST'),
    remove: async () => {
      setBusy('delete');
      try {
        await adminFetch(token, base, { method: 'DELETE' });
        onChanged();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Delete failed');
        return false;
      } finally {
        setBusy(null);
      }
    },
  };
};
