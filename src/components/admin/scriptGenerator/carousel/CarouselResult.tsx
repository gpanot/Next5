'use client';

import { useState } from 'react';
import type { GeneratedCarousel } from '../../../../types/admin/carousel';
import { CAROUSEL_TEMPLATES } from '../../../../types/admin/carouselTemplates';
import { RefineBox } from '../RefineBox';
import { SaveBadge } from '../SavedScripts';
import { amberTag, eyebrowClass as label, secondaryBtn, softCard } from '../ui';
import { CarouselPreview } from './CarouselPreview';
import type { CarouselBuilder } from './useCarouselBuilder';
import { useSlidePhotos } from './useSlidePhotos';

/** The whole carousel as plain text: slides, sound, caption and bio line. */
export function carouselToText(c: GeneratedCarousel): string {
  const slides = c.slides.map((s, i) => {
    const top = `${i + 1}. ${s.text}\n   Photo: ${s.photo}`;
    return s.bottomText ? `${top}\n   Bottom: ${s.bottomText}\n   Bottom photo: ${s.bottomPhoto ?? ''}` : top;
  });
  return [`# ${c.title}`, `Template: ${CAROUSEL_TEMPLATES[c.template].label}`, '', '## Slides', ...slides, '', '## Sound', c.song, '', '## Caption', c.caption, '', '## Bio', c.bioCta].join('\n');
}

function CopyButton({ text, idle }: { text: string; idle: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      setState('failed');
    }
    setTimeout(() => setState('idle'), 2000);
  };
  return <button type="button" onClick={() => void copy()} className={secondaryBtn}>{state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : idle}</button>;
}

function SlideList({ carousel }: { carousel: GeneratedCarousel }) {
  return (
    <ol className={`${softCard} divide-y divide-app-line`}>
      {carousel.slides.map((s, i) => (
        <li key={i} className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[110px_1fr] sm:gap-4">
          <div>
            <span className={amberTag}>Slide {i + 1}</span>
            <p className={`${label} mt-1.5`}>{s.label}</p>
          </div>
          <div className="space-y-1 text-sm text-app-ink">
            <p className="font-semibold">“{s.text}”</p>
            <p className="text-xs text-app-muted">{s.bottomText ? 'Top photo' : 'Photo'}: {s.photo}</p>
            {s.bottomText && <p className="pt-1 font-semibold">“{s.bottomText}”</p>}
            {s.bottomPhoto && <p className="text-xs text-app-muted">Bottom photo: {s.bottomPhoto}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Sound, caption and bio line: what goes with the slides when posting. */
function PostDetails({ carousel }: { carousel: GeneratedCarousel }) {
  const rows: Array<[string, string, string]> = [
    ['Sound', carousel.song, 'Add it so the carousel can reach the Reels tab and Explore.'],
    ['Caption', carousel.caption, ''],
    ['Bio call to action', carousel.bioCta, 'New viewers check your profile next. Name the pain this carousel solved.'],
  ];
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {rows.map(([title, value, hint]) => (
        <div key={title} className={`${softCard} space-y-1.5`}>
          <p className={label}>{title}</p>
          <p className="text-sm text-app-ink">{value || '—'}</p>
          {hint && <p className="text-xs text-app-muted">{hint}</p>}
        </div>
      ))}
    </div>
  );
}

/** The finished carousel: preview with photos (or the slide list), what to post with it, and the refine chat. */
export function CarouselResult({ token, c }: { token: string; c: CarouselBuilder }) {
  const [view, setView] = useState<'preview' | 'slides'>('preview');
  const photos = useSlidePhotos(token, c.draftId, c.savedPhotos);
  if (!c.carousel) return null;
  const carousel = c.carousel;
  return (
    <div className={`space-y-5 ${c.busy ? 'opacity-70' : ''}`}>
      <div>
        <div className="flex items-center gap-3">
          <p className={label}>Your carousel</p>
          <SaveBadge state={c.saveState} onRetry={c.retrySave} />
        </div>
        <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-app-ink">{carousel.title}</h2>
        <p className="text-sm text-app-muted">{carousel.slides.length} slides · {CAROUSEL_TEMPLATES[carousel.template].label}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex gap-1 rounded-xl bg-app-panel p-1 shadow-sm">
          {(['preview', 'slides'] as const).map((v) => (
            <button key={v} type="button" onClick={() => setView(v)} className={`min-h-9 rounded-lg px-3 text-sm font-semibold transition ${view === v ? 'bg-app-cta text-app-cta-ink' : 'text-app-muted hover:text-app-ink'}`}>{v === 'preview' ? 'Preview' : 'Slide by slide'}</button>
          ))}
        </div>
        <CopyButton text={carouselToText(carousel)} idle="Copy carousel as text" />
      </div>
      {view === 'preview' ? <CarouselPreview carousel={carousel} photos={photos} /> : <SlideList carousel={carousel} />}
      <PostDetails carousel={carousel} />
      <RefineBox what="carousel" chat={c.chat} busy={c.busy} error={c.error} onRefine={(v) => void c.refine(v)} />
    </div>
  );
}
