'use client';

import { useState } from 'react';
import type { AutoSlideshowDto } from '../../../types/admin/autoSlideshow';

type TextDraft = { index: number; title: string; body: string };
type CaptionDraft = { caption: string; tags: string };

export const parseTags = (text: string) => text.split(/[\s,]+/).map((t) => t.replace(/^#+/, '')).filter(Boolean);

/**
 * Unsaved edits of the on-screen slide's text and of the caption, so one Save button can store both.
 * A null draft means "not edited": the field shows the saved value.
 */
export const useSlideshowDrafts = (show: AutoSlideshowDto, slideIndex: number) => {
  const [text, setText] = useState<TextDraft | null>(null);
  const [captionDraft, setCaptionDraft] = useState<CaptionDraft | null>(null);
  const slide = show.slides[slideIndex];
  const activeText = text && text.index === slideIndex ? text : null;

  const title = activeText?.title ?? slide?.title ?? '';
  const body = activeText?.body ?? slide?.body ?? '';
  const caption = captionDraft?.caption ?? show.caption;
  const tags = captionDraft?.tags ?? show.hashtags.map((h) => `#${h}`).join(' ');

  const textDirty = !!slide && (title.trim() !== slide.title || body.trim() !== slide.body);
  const captionDirty = caption.trim() !== show.caption || parseTags(tags).join(' ') !== show.hashtags.join(' ');

  return {
    title,
    body,
    caption,
    tags,
    textDirty,
    captionDirty,
    dirty: textDirty || captionDirty,
    valid: !textDirty || title.trim().length > 0,
    setTitle: (value: string) => setText({ index: slideIndex, title: value, body }),
    setBody: (value: string) => setText({ index: slideIndex, title, body: value }),
    setCaption: (value: string) => setCaptionDraft({ caption: value, tags }),
    setTags: (value: string) => setCaptionDraft({ caption, tags: value }),
    clearText: () => setText(null),
    clearCaption: () => setCaptionDraft(null),
  };
};
