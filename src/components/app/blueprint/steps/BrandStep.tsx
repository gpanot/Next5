'use client';

import type { Topics } from '../../../../lib/blueprint/schema';
import { BrandTree } from '../BrandTree';
import { BRAND_STEP, INTRO } from '../copy';
import { StepHeading } from '../StepHeading';
import { StepNav } from '../StepNav';
import type { StepNavProps } from './types';

const FormulaCard = () => (
  <section className="rounded-2xl border border-app-line bg-app-panel p-4 shadow-sm sm:p-5">
    <h3 className="mb-3 text-[16px] font-semibold text-app-ink">{BRAND_STEP.formulaTitle}</h3>
    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
      {[BRAND_STEP.topic, BRAND_STEP.format].map((part, i) => (
        <div key={part.label} className="contents">
          {i > 0 && <span aria-hidden className="text-center text-[20px] font-semibold text-app-muted">+</span>}
          <div className="flex-1 rounded-xl bg-app-sunken px-4 py-3">
            <p className="text-[15px] font-semibold text-app-ink">{part.label}</p>
            <p className="text-[13px] text-app-muted">{part.hint}</p>
          </div>
        </div>
      ))}
    </div>
    <p className="mt-3 text-[14px] text-app-muted">{BRAND_STEP.tip}</p>
  </section>
);

/** Step 1: the tree and the topic + format idea. The tree fills in from the topics as they are typed. */
export const BrandStep = ({ topics, onNext }: StepNavProps & { topics: Topics }) => (
  <div className="flex flex-col gap-5">
    <header className="flex flex-col gap-3 pb-2 pt-2">
      <p className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-app-muted">{INTRO.kicker}</p>
      <h1 className="text-[44px] leading-[0.95] text-app-ink sm:text-[64px]">
        {INTRO.title}
        <span className="nat-serif block text-[0.8em]">{INTRO.accent}</span>
      </h1>
      <p className="max-w-xl text-[17px] text-app-muted">{INTRO.body}</p>
    </header>
    <StepHeading step={0} title={BRAND_STEP.title} accent={BRAND_STEP.accent}>{BRAND_STEP.body}</StepHeading>
    <BrandTree topics={topics} rootLabel="You" />
    <FormulaCard />
    <StepNav onNext={onNext} nextLabel={BRAND_STEP.next} />
  </div>
);
