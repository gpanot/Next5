'use client';

import { useEffect, useRef } from 'react';
import { MAX_CAMPAIGN_CONTENT, type CampaignDraft, type CampaignPhotoDto } from '../../../../types/admin/slideshowCampaign';

type Props = {
  draft: CampaignDraft;
  photos: CampaignPhotoDto[];
  index: number;
  onPick: (i: number) => void;
  onAdd: () => void;
};

type Card = { label: string; text: string; placeholder: string; photoUrl: string | null; badge: string | null };

const PLACEHOLDERS = { hook: 'Your hook line', item: 'Your point, plus the one detail that makes it land', cta: 'What to do next' };

/** Slide 0 is the hook (its first line on its first photo); then the content cards and the CTA. */
const cardsOf = (draft: CampaignDraft, photos: CampaignPhotoDto[]): Card[] => {
  const url = (i: number | null | undefined) => (i === null || i === undefined ? null : photos[i]?.url ?? null);
  const rotating = draft.hooks.length;
  return [
    { label: rotating > 1 ? `Hook · ${rotating} rotating` : 'Hook', text: draft.hooks[0] ?? '', placeholder: PLACEHOLDERS.hook, photoUrl: url(draft.hookPhotos[0]), badge: draft.hookPhotos.length > 1 ? `${draft.hookPhotos.length} photos` : null },
    ...draft.cards.map((c) => ({ label: c.role === 'cta' ? 'CTA' : 'Content', text: c.title, placeholder: PLACEHOLDERS[c.role], photoUrl: url(c.photo), badge: null })),
  ];
};

function PhotoIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}

/** Every slide of the campaign as a numbered 9:16 card; the one being edited is ringed. A last tile adds a content slide. */
export function CampaignStrip({ draft, photos, index, onPick, onAdd }: Props) {
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
              className={`relative flex w-32 flex-col overflow-hidden rounded-xl border-2 bg-zinc-900 transition active:scale-[0.98] sm:w-44 ${on ? 'border-emerald-400 shadow-sm shadow-emerald-500/20' : 'border-white/10 hover:border-white/30'}`}
            >
              <span className="relative block aspect-[9/16] w-full bg-white/5">
                {c.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.photoUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                )}
                <span className="absolute inset-x-2 top-[38%] text-center text-[10px] leading-tight font-bold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.9)] sm:text-xs">
                  {c.text || <span className="font-medium text-white/40 [text-shadow:none]">{c.placeholder}</span>}
                </span>
                <span className="absolute top-2 left-2 flex h-6 min-w-6 items-center justify-center rounded-md bg-black/70 px-1 text-[11px] font-bold text-white">{i + 1}</span>
                <span className="absolute top-2 right-2 flex h-6 items-center gap-1 rounded-md bg-black/60 px-1.5 text-[10px] font-semibold text-white/80">
                  <PhotoIcon />
                  {c.badge}
                </span>
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
