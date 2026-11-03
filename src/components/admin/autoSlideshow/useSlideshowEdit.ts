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
  /** Background edits sent or waiting their turn: the editor shows "Saving…" until none is left. */
  const [waiting, setWaiting] = useState(0);
  /** The last photo picked per slide: a pick still waiting its turn when a newer one comes is skipped, not rendered. */
  const lastPick = useRef(new Map<number, number>());

  /** A background edit, after the ones before it: the saved slideshow, or null when it failed (with the error shown) or
   *  `skip` says it is out of date. */
  const quiet = (path: string, body: unknown, failure: string, skip?: () => boolean): Promise<AutoSlideshowDto | null> => {
    setWaiting((n) => n + 1);
    const run = line.current.then(async () => {
      try {
        if (skip?.()) return null;
        const res = await adminFetch<Response>(token, `${base}${path}`, { method: 'PATCH', body: JSON.stringify(body) });
        setShow(res.slideshow);
        onChanged();
        return res.slideshow;
      } catch (err) {
        setError(err instanceof Error ? err.message : failure);
        return null;
      } finally {
        setWaiting((n) => n - 1);
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
    saving: waiting > 0,
    /** A photo from the row: the editor shows it at once (useLiveEdits), saved and rendered in the background. */
    pickPhoto: (index: number, photoIndex: number) => {
      lastPick.current.set(index, photoIndex);
      return quiet(`/slides/${index}`, { photoIndex }, 'The photo could not be changed', () => lastPick.current.get(index) !== photoIndex);
    },
    /** Slide text as typed, saved and rendered in the background. */
    saveText: (index: number, title: string, body: string) => quiet(`/slides/${index}`, { title, body }, 'The text could not be saved'),
    /** The caption and hashtags as typed, saved in the background. */
    autosaveCaption: (caption: string, hashtags: string[]) => quiet('', { caption, hashtags }, 'The caption could not be saved'),
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
    /** The text size on every hook, content or CTA slide, in the background. */
    sizeText: (group: 'hook' | 'content' | 'cta', size: number) => quiet('', { textSize: { group, size } }, 'The text size could not be saved'),
    deleteSlide: (index: number) => call(`delete-slide-${index}`, `/slides/${index}`, 'DELETE'),
    /** A new photo for slide `index`; `choice`: the prompt and avatar picked in the "Generate New" dialog. */
    newPhoto: (index: number, choice?: { prompt: string; castId: string | null }) => call(`photo-${index}`, `/slides/${index}/photo`, 'POST', choice),
    /** The slide's photo route, for the "Generate New" dialog's options. */
    photoPath: (index: number) => `${base}/slides/${index}/photo`,
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
