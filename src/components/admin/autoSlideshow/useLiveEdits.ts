'use client';

import { useState } from 'react';
import { linkedTextSlides, type AutoSlideDto, type AutoSlideshowDto } from '../../../types/admin/autoSlideshow';
import type { SlideLook, TextAt } from '../../../types/slideText';

/** What the editor shows on a slide before its new image is in: where its text was dropped, its new text styles. */
export type LiveEdit = { textAt?: TextAt; look?: SlideLook; bodyLook?: SlideLook };
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

  /** Slide i as it shows now: its saved fields with the live edits on top. */
  const slideAt = (i: number): AutoSlideDto | undefined => {
    const s = slides[i];
    const e = edits[i];
    return s && e ? { ...s, ...(e.look ? { look: e.look } : {}), ...(e.bodyLook ? { bodyLook: e.bodyLook } : {}) } : s;
  };

  return { edits, move, style, slideAt };
};
