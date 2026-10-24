'use client';

import { CAROUSEL_TEMPLATES, CAROUSEL_TYPES, carouselSlideCount, templatesOf, type CarouselTemplate, type CarouselType } from '../../../types/admin/carouselTemplates';
import { amberTag, BackButton, eyebrowClass, optionCard, StepFrame } from './ui';

type Props = { selected: CarouselTemplate | null; onPick: (t: CarouselTemplate) => void; onBack: () => void };

function TemplateCard({ t, selected, onPick }: { t: CarouselTemplate; selected: boolean; onPick: () => void }) {
  const info = CAROUSEL_TEMPLATES[t];
  const count = carouselSlideCount(t);
  return (
    <button type="button" onClick={onPick} aria-pressed={selected} className={`${optionCard} ${selected ? '!ring-amber-500' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-base font-extrabold text-app-ink">{info.label}</p>
        <span className={amberTag}>{count} slides</span>
      </div>
      <p className="mt-1.5 text-sm text-app-muted">{info.desc}</p>
      <p className="mt-2 text-xs italic text-app-ink">“{info.example}”</p>
    </button>
  );
}

/** Step 02 for a carousel: the 3 types, each with its ready templates. Picking a template moves on. */
export function CarouselTemplateStep({ selected, onPick, onBack }: Props) {
  return (
    <StepFrame eyebrow="Step 02 · Carousel · Pick a template" title="Which carousel do you want to post?" help="Each template is a proven slide plan. Pick one and the AI fills every slide with your story or your topic.">
      {(Object.keys(CAROUSEL_TYPES) as CarouselType[]).map((type) => (
        <section key={type} className="space-y-3">
          <div>
            <p className={eyebrowClass}>{CAROUSEL_TYPES[type].label}</p>
            <p className="text-sm text-app-muted">{CAROUSEL_TYPES[type].desc}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {templatesOf(type).map((t) => <TemplateCard key={t} t={t} selected={selected === t} onPick={() => onPick(t)} />)}
          </div>
        </section>
      ))}
      <BackButton label="Back to format" onClick={onBack} />
    </StepFrame>
  );
}
