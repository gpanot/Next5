'use client';

import { Check, Clapperboard, GalleryHorizontal, Video, X, type LucideIcon } from 'lucide-react';
import { BLUEPRINT_FORMATS, type BlueprintFormat } from '../../../../lib/scriptGenerator/types';
import { FORMAT_COPY, FORMATS_STEP } from '../copy';
import { StepHeading } from '../StepHeading';
import { StepNav } from '../StepNav';
import type { StepNavProps } from './types';

export const FORMAT_ICON: Record<BlueprintFormat, LucideIcon> = { talking: Video, carousel: GalleryHorizontal, broll: Clapperboard };

const FormatCard = ({ format, index }: { format: BlueprintFormat; index: number }) => {
  const copy = FORMAT_COPY[format];
  const Icon = FORMAT_ICON[format];
  const rows = [
    [FORMATS_STEP.whatLabel, copy.what],
    [FORMATS_STEP.exampleLabel, copy.example],
    [FORMATS_STEP.bestLabel, copy.bestFor],
  ];
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-2xl border border-app-line bg-app-panel p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-app-accent-soft text-app-accent"><Icon aria-hidden className="h-5 w-5" /></span>
        <h3 className="text-[16px] font-semibold text-app-ink">{index + 1}. {copy.name}</h3>
      </div>
      <dl className="flex flex-col gap-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-app-muted">{label}</dt>
            <dd className="text-[14px] text-app-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

const ListCard = ({ title, items, good }: { title: string; items: string[]; good: boolean }) => (
  <section className={['rounded-2xl border p-4', good ? 'border-app-success/40 bg-app-success/5' : 'border-app-danger/30 bg-app-danger/5'].join(' ')}>
    <h3 className="mb-2 text-[15px] font-semibold text-app-ink">{title}</h3>
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-[14px] text-app-ink">
          {good ? <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-app-success" /> : <X aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-app-danger" />}
          {item}
        </li>
      ))}
    </ul>
  </section>
);

/** Step 3: the three formats, then what makes a post work or flop. Read only. */
export const FormatsStep = ({ onBack, onNext }: StepNavProps) => (
  <div className="flex flex-col gap-5">
    <StepHeading step={2} title={FORMATS_STEP.title} accent={FORMATS_STEP.accent}>{FORMATS_STEP.body}</StepHeading>
    <div className="grid gap-4 lg:grid-cols-3">
      {BLUEPRINT_FORMATS.map((format, i) => <FormatCard key={format} format={format} index={i} />)}
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <ListCard title={FORMATS_STEP.goodTitle} items={FORMATS_STEP.good} good />
      <ListCard title={FORMATS_STEP.badTitle} items={FORMATS_STEP.bad} good={false} />
    </div>
    <StepNav onBack={onBack} onNext={onNext} nextLabel={FORMATS_STEP.next} />
  </div>
);
