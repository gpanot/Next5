'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { AutoSlideshowDto } from '../../../types/admin/autoSlideshow';
import { parseTags, type useSlideshowDrafts } from './useSlideshowDrafts';

/** Typing settles this long before it is saved, as in the Hooks Volume editor (useCampaign.ts). */
const SAVE_DELAY_MS = 700;

type Drafts = ReturnType<typeof useSlideshowDrafts>;
type Save = { text: (index: number, title: string, body: string) => void; caption: (caption: string, hashtags: string[]) => void };
type Timed = { timer: ReturnType<typeof setTimeout> | null; send: (() => void) | null };

const clear = (timed: Timed) => {
  if (timed.timer) clearTimeout(timed.timer);
  timed.timer = null;
  timed.send = null;
};

const flushOne = (timed: Timed) => {
  const send = timed.send;
  clear(timed);
  send?.();
};

const schedule = (timed: Timed, send: () => void) => {
  clear(timed);
  timed.send = send;
  timed.timer = setTimeout(() => flushOne(timed), SAVE_DELAY_MS);
};

/**
 * No Save button: slide text and the caption save themselves once typing settles, when moving to another slide and when
 * the editor closes. An empty headline is not saved: leaving it brings the saved one back.
 */
export const useSlideshowAutosave = (show: AutoSlideshowDto, drafts: Drafts, slide: number, save: Save) => {
  const text = useRef<Timed>({ timer: null, send: null });
  const caption = useRef<Timed>({ timer: null, send: null });
  const latest = useRef(save);
  useEffect(() => {
    latest.current = save;
  });

  const saved = show.slides[drafts.textDraft?.index ?? -1];
  const draftTitle = drafts.textDraft?.title.trim() ?? '';
  const draftBody = drafts.textDraft?.body.trim() ?? '';
  const textIndex = drafts.textDraft?.index ?? null;
  const textChanged = textIndex !== null && !!saved && (draftTitle !== saved.title || draftBody !== saved.body);
  const textValid = draftTitle.length > 0;

  useEffect(() => {
    if (!textChanged || !textValid || textIndex === null) return clear(text.current);
    schedule(text.current, () => latest.current.text(textIndex, draftTitle, draftBody));
  }, [textChanged, textValid, textIndex, draftTitle, draftBody]);

  const { captionDirty, caption: captionText, tags } = drafts;
  useEffect(() => {
    if (!captionDirty) return clear(caption.current);
    schedule(caption.current, () => latest.current.caption(captionText.trim(), parseTags(tags)));
  }, [captionDirty, captionText, tags]);

  const flush = useCallback(() => {
    flushOne(text.current);
    flushOne(caption.current);
  }, []);

  // Moving to another slide saves the one left, since its draft is about to be replaced.
  const { clearText } = drafts;
  const leftEmpty = useRef(false);
  const emptied = textChanged && !textValid;
  useEffect(() => {
    leftEmpty.current = emptied;
  }, [emptied]);
  useEffect(() => () => {
    flushOne(text.current);
    if (leftEmpty.current) clearText();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs on slide change only; clearText is new each render
  }, [slide]);

  // Saves what is left when the editor closes.
  useEffect(() => () => flush(), [flush]);

  return { flush };
};
