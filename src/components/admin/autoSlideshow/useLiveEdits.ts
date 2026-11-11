'use client';

import { useState } from 'react';
import { linkedTextSlides, type AutoSlideDto, type AutoSlideshowDto } from '../../../types/admin/autoSlideshow';
import type { SlideLook, TextAt } from '../../../types/slideText';

/** What the editor shows on a slide before its new image is in: where its text was dropped, its new text styles and
 *  text, the photo picked. */
export type LiveEdit = { textAt?: TextAt; look?: SlideLook; bodyLook?: SlideLook; textSize?: number; title?: string; body?: string; photoIndex?: number };
type Edits = Record<number, LiveEdit>;

/** Slides of one kind, as the text style menu groups them. */
export type StyleGroup = 'hook' | 'content' | 'cta';
export const styleGroupOf = (slide: Pick<AutoSlideDto, 'role'>): StyleGroup => (slide.role === 'hook' || slide.role === 'cta' ? slide.role : 'content');

/** Loads an image into the browser cache, so the new render shows at once when the drawn text steps aside. */
const preload = (url: string) =>
  new Promise<void>((done) => {
    const img = new Image();
    img.onload = img.onerror = () => done();
    img.src = url;
  });

/** Edits without the ones that are now rendered (a key changed again since keeps its newer value). */
const settle = (edits: Edits, done: Edits): Edits => {
  const next = { ...edits };
  for (const [i, patch] of Object.entries(done)) {
    const rest: LiveEdit = { ...next[Number(i)] };
    for (const key of Object.keys(patch) as (keyof LiveEdit)[]) if (rest[key] === patch[key]) delete rest[key];
    if (Object.keys(rest).length > 0) next[Number(i)] = rest;
    else delete next[Number(i)];
  }
  return next;
};

type Save = {
  placeText: (index: number, at: TextAt) => Promise<AutoSlideshowDto | null>;
  styleText: (group: StyleGroup, part: 'look' | 'bodyLook', look: SlideLook) => Promise<AutoSlideshowDto | null>;
  sizeText: (group: StyleGroup, size: number) => Promise<AutoSlideshowDto | null>;
  pickPhoto: (index: number, photoIndex: number) => Promise<AutoSlideshowDto | null>;
  saveText: (index: number, title: string, body: string) => Promise<AutoSlideshowDto | null>;
};

/**
 * Edits shown on the slides at once, as layers over the photo (the campaign editor's way), while the slides render
 * again in the background. Each edit clears once its slides' new images are loaded.
 */
export const useLiveEdits = (slides: AutoSlideDto[], save: Save) => {
  const [edits, setEdits] = useState<Edits>({});

  const apply = (patch: Edits, send: () => Promise<AutoSlideshowDto | null>) => {
    setEdits((m) => {
      const next = { ...m };
      for (const [i, p] of Object.entries(patch)) next[Number(i)] = { ...next[Number(i)], ...p };
      return next;
    });
    void send().then(async (saved) => {
      const urls = Object.keys(patch).flatMap((i) => saved?.slides[Number(i)]?.imageUrl ?? []);
      await Promise.all(urls.map(preload));
      setEdits((m) => settle(m, patch));
    });
  };

  /** Text dropped on slide `index`: it stays centered, and the locked content slides take the same height. */
  const move = (index: number, at: TextAt) => {
    const textAt = { x: 0.5, y: at.y };
    const patch: Edits = {};
    for (const i of linkedTextSlides(slides, index)) patch[i] = { textAt };
    apply(patch, () => save.placeText(index, textAt));
  };

  const style = (group: StyleGroup, part: 'look' | 'bodyLook', look: SlideLook) => {
    const patch: Edits = {};
    slides.forEach((s, i) => {
      if (styleGroupOf(s) === group) patch[i] = { [part]: look };
    });
    apply(patch, () => save.styleText(group, part, look));
  };

  /** A text size picked: on every slide of the kind at once. */
  const size = (group: StyleGroup, textSize: number) => {
    const patch: Edits = {};
    slides.forEach((s, i) => {
      if (styleGroupOf(s) === group) patch[i] = { textSize };
    });
    apply(patch, () => save.sizeText(group, textSize));
  };

  /** A photo picked for slide `index`: on the slide at once (the row's copy is already in the browser). */
  const pickPhoto = (index: number, photoIndex: number) => apply({ [index]: { photoIndex } }, () => save.pickPhoto(index, photoIndex));

  /** Slide text typed: it stays drawn over the slide until the new image is in. */
  const saveText = (index: number, title: string, body: string) => apply({ [index]: { title, body } }, () => save.saveText(index, title, body));

  /** Slide i as it shows now: its saved fields with the live edits on top. */
  const slideAt = (i: number): AutoSlideDto | undefined => {
    const s = slides[i];
    const e = edits[i];
    if (!s || !e) return s;
    return {
      ...s,
      ...(e.look ? { look: e.look } : {}),
      ...(e.bodyLook ? { bodyLook: e.bodyLook } : {}),
      ...(e.textSize !== undefined ? { textSize: e.textSize } : {}),
      ...(e.title !== undefined ? { title: e.title } : {}),
      ...(e.body !== undefined ? { body: e.body } : {}),
      ...(e.photoIndex !== undefined ? { photoIndex: e.photoIndex } : {}),
    };
  };

  return { edits, move, style, size, pickPhoto, saveText, slideAt };
};
