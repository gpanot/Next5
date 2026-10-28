'use client';

import { CAROUSEL_QUESTIONS, CAROUSEL_TEMPLATES, LIST_COUNTS, type CarouselQuestionKey } from '../../../../types/admin/carouselTemplates';
import { BackButton, eyebrowClass, primaryBtn, StepFrame } from '../ui';
import type { CarouselBuilder } from './useCarouselBuilder';

const pill = (on: boolean) =>
  `min-h-11 rounded-xl px-4 text-sm font-semibold shadow-sm transition active:scale-[0.98] ${on ? 'bg-app-cta text-app-cta-ink' : 'bg-app-panel text-app-ink hover:ring-1 hover:ring-amber-400'}`;

function Question({ k, value, onChange }: { k: CarouselQuestionKey; value: string; onChange: (v: string) => void }) {
  const q = CAROUSEL_QUESTIONS[k];
  return (
    <div className="space-y-2">
      <label htmlFor={`cq-${k}`} className="block text-lg font-extrabold text-app-ink">{q.title}{q.required ? '' : ' (optional)'}</label>
      <p className="text-sm text-app-muted">{q.help}</p>
      <textarea id={`cq-${k}`} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Type here" className="min-h-24 w-full rounded-2xl bg-app-panel p-4 text-base text-app-ink shadow-sm outline-none ring-1 ring-transparent placeholder:text-app-muted/60 focus:ring-amber-400" />
      <div className="flex flex-wrap gap-2">
        {q.examples.map((e) => (
          <button key={e} type="button" onClick={() => onChange(e)} className="rounded-lg bg-app-panel px-3 py-1.5 text-left text-xs text-app-muted shadow-sm transition hover:text-app-ink hover:ring-1 hover:ring-amber-400">{e}</button>
        ))}
      </div>
    </div>
  );
}

/** Carousel step 2: the template's questions on one page, plus the list length or her/him where they apply. */
export function CarouselQuestions({ c }: { c: CarouselBuilder }) {
  if (!c.template) return null;
  const t = CAROUSEL_TEMPLATES[c.template];
  const missing = t.questions.some((k) => CAROUSEL_QUESTIONS[k].required && !c.answers[k]?.trim());
  return (
    <StepFrame eyebrow={`Carousel · Step 02 · ${t.label}`} title="Tell us the real story" help="Only true details. The AI never invents facts: anything missing becomes a [placeholder] you fill in.">
      {t.type === 'numbered_list' && (
        <div className="space-y-2">
          <p className={eyebrowClass}>How many items?</p>
          <div className="flex flex-wrap gap-2">
            {LIST_COUNTS.map((n) => <button key={n} type="button" aria-pressed={c.listCount === n} onClick={() => c.setListCount(n)} className={pill(c.listCount === n)}>{n}</button>)}
          </div>
        </div>
      )}
      {c.template === 'split_to_be_her' && (
        <div className="space-y-2">
          <p className={eyebrowClass}>To be...</p>
          <div className="flex gap-2">
            {(['her', 'him'] as const).map((p) => <button key={p} type="button" aria-pressed={c.pronoun === p} onClick={() => c.setPronoun(p)} className={pill(c.pronoun === p)}>{p}</button>)}
          </div>
        </div>
      )}
      <div className="space-y-6">
        {t.questions.map((k) => <Question key={k} k={k} value={c.answers[k] ?? ''} onChange={(v) => c.setAnswer(k, v)} />)}
      </div>
      {c.error && <p role="alert" className="text-sm text-app-danger">{c.error}</p>}
      <div className="flex items-center justify-between pt-2">
        <BackButton label="Back to templates" onClick={() => c.setStep('template')} disabled={c.busy} />
        <button type="button" onClick={() => void c.submitAnswers()} disabled={missing || c.busy} className={primaryBtn}>
          {c.busy ? 'Writing your carousel…' : t.fixedHook ? 'Write my carousel' : 'See slide 1 options'}
        </button>
      </div>
    </StepFrame>
  );
}
