'use client';

import { useEffect, useRef } from 'react';
import { lookOfRole, MAX_CAMPAIGN_CONTENT, shownBody, type CampaignDraft, type CampaignPhotoDto } from '../../../../types/admin/slideshowCampaign';
import type { TextAt } from '../../../../types/slideText';
import { badgesOf, type PreviewSlide } from './previewSlides';
import { PreviewSlideView } from './PreviewSlideView';

type Props = {
  draft: CampaignDraft;
  photos: CampaignPhotoDto[];
  index: number;
  onPick: (i: number) => void;
  onAdd: () => void;
  /** The ringed slide's text was dragged: slide i's text now sits at `at`. */
  onMoveText: (i: number, at: TextAt) => void;
  /** The ringed CTA's badge row was dragged: its top now sits at `y`. */
  onMoveBadges: (i: number, y: number) => void;
};

type Card = { label: string; slide: PreviewSlide };

/**
 * Slide 0 is the hook (its first line on its first photo); then the content cards and the CTA. Each card is drawn as
 * the Preview draws it (thumb photo, text in the picked look), so the strip shows the slide as it will post.
 */
const cardsOf = (draft: CampaignDraft, photos: CampaignPhotoDto[]): Card[] => {
  const url = (i: number | null | undefined) => (i === null || i === undefined ? null : photos[i]?.url ?? null);
  const rotating = draft.hooks.length;
  const hook: PreviewSlide = { kind: 'draft', photoUrl: url(draft.hookPhotos[0]), role: 'hook', title: draft.hooks[0] ?? '', body: '', look: draft.looks.hook, textAt: draft.hookTextAt };
  return [
    { label: rotating > 1 ? `Hook · ${rotating} rotating` : 'Hook', slide: hook },
    ...draft.cards.map((c): Card => ({
      label: c.role === 'cta' ? 'CTA' : 'Content',
      slide: { kind: 'draft', photoUrl: url(c.photo), role: c.role, title: c.title, body: shownBody(c), look: lookOfRole(draft.looks, c.role), textAt: c.textAt, ...badgesOf(c) },
    })),
  ];
};

/** Every slide of the campaign as a numbered 9:16 card; the one being edited is ringed and its text can be dragged.
 *  A last tile adds a content slide. */
export function CampaignStrip({ draft, photos, index, onPick, onAdd, onMoveText, onMoveBadges }: Props) {
  const list = useRef<HTMLOListElement>(null);
  const cards = cardsOf(draft, photos);
  const contentCount = draft.cards.length - 1;

  useEffect(() => {
    const card = list.current?.children[index] as HTMLElement | undefined;
    card?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [index]);

  return (
    <ol ref={list} aria-label="Slides" className="flex gap-2.5 overflow-x-auto px-4 py-3 [scrollbar-width:thin]">
      {cards.map((c, i) => {
        const on = i === index;
        return (
          <li key={i} className="shrink-0">
            <button
              type="button"
              onClick={() => onPick(i)}
              aria-current={on ? 'true' : undefined}
              aria-label={`Slide ${i + 1}, ${c.label}`}
              className={`relative flex w-[141px] flex-col overflow-hidden rounded-xl border-2 bg-zinc-900 transition active:scale-[0.98] sm:w-[194px] ${on ? 'border-emerald-400 shadow-sm shadow-emerald-500/20' : 'border-white/10 hover:border-white/30'}`}
            >
              <span className="relative block aspect-[9/16] w-full bg-white/5">
                <span className="absolute inset-0"><PreviewSlideView slide={c.slide} movable={on} onMoveText={(at) => onMoveText(i, at)} onMoveBadges={(y) => onMoveBadges(i, y)} /></span>
                <span className="absolute top-2 left-2 flex h-6 min-w-6 items-center justify-center rounded-md bg-black/70 px-1 text-[11px] font-bold text-white">{i + 1}</span>
              </span>
              <span className={`truncate px-3 py-2 text-left text-sm font-medium ${on ? 'text-white' : 'text-white/60'}`}>{c.label}</span>
            </button>
          </li>
        );
      })}
      {contentCount < MAX_CAMPAIGN_CONTENT && (
        <li className="shrink-0">
          <button type="button" onClick={onAdd} aria-label="Add a content slide" className="flex aspect-[9/16] w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-white/20 text-xs font-semibold text-white/60 transition hover:border-white/40 hover:text-white active:scale-[0.98] sm:w-24">
            <span className="text-2xl leading-none">+</span>
            Slide
          </button>
        </li>
      )}
    </ol>
  );
}
