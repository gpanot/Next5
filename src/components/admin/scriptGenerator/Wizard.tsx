'use client';

import { useState } from 'react';
import {
  SCRIPT_FORMATS,
  SCRIPT_GOALS,
  SCRIPT_STRUCTURES,
  type GenerateScriptInput,
  type ScriptFormat,
  type ScriptGoal,
  type ScriptStructure,
} from '../../../types/admin/scriptGenerator';
import { EMPTY_INPUT, type WizardInput } from './useScriptGenerator';
import { amberTag, BackButton, eyebrowClass, optionCard, primaryBtn, ProgressBar, StepFrame } from './ui';

type Props = { error: string; initial: GenerateScriptInput | null; onSubmit: (input: GenerateScriptInput) => void };
type TextKey = 'audience' | 'message' | 'credibility';
type Question = { key: TextKey; title: string; help: string; required: boolean; examples: string[] };

const QUESTIONS: Question[] = [
  { key: 'audience', title: 'Who is this for?', help: "One specific person. 'How to know if you are ready' is a dead hook. 'Destination wedding brides who have not picked a venue yet' is alive.", required: true,
    examples: ['Active adults in their 40s with chronic back pain who do not want surgery', 'First-time moms in their 30s who feel like they are failing at everything', 'Solopreneurs making under $5k/month who cannot figure out why content is not converting'] },
  { key: 'message', title: 'What is the video about, and what should they walk away with?', help: 'Talk it out: what you want to film, and the one thing the viewer should leave with. One feeling, one shift, or one decision.', required: true,
    examples: ['Three things people get wrong about back pain. They should realise it is fixable without surgery, and DM me to learn how.', "Why your toddler's tantrums are not about the cookie. Exhausted moms should feel like a normal mom doing a hard job."] },
  { key: 'credibility', title: 'Why are you the right person to say this?', help: 'Lived experience or a real result or number, not a job title. We never invent one, so only share what is true. Placed in the first 10 seconds. Optional.', required: false,
    examples: ['I have treated over 2,000 athletes and active adults for back pain in my clinic', 'I was making $300/month from content for 18 months before something finally clicked'] },
];

function Choice({ title, tag, desc, selected, onClick }: { title: string; tag?: string; desc?: string; selected?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`${optionCard} ${selected ? '!ring-amber-500' : ''}`} aria-pressed={!!selected}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-lg font-extrabold text-app-ink">{title}</p>
        {tag && <span className={`${amberTag} hidden sm:inline`}>{tag}</span>}
      </div>
      {tag && <span className={`${amberTag} mt-2 inline-block sm:hidden`}>{tag}</span>}
      {desc && <p className="mt-2 text-sm text-app-muted">{desc}</p>}
    </button>
  );
}

type QuestionProps = { q: Question; index: number; formatLabel: string; value: string; onChange: (v: string) => void; onBack: () => void; onNext: () => void };

function QuestionStep({ q, index, formatLabel, value, onChange, onBack, onNext }: QuestionProps) {
  const total = QUESTIONS.length + 1;
  const title = q.required ? q.title : `${q.title} (optional)`;
  return (
    <StepFrame eyebrow={`Step 03 · ${formatLabel} · 0${index + 1} of 0${total}`} title={title} help={q.help} progress={<ProgressBar total={total} current={index} />}>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder="Type here" className="min-h-40 w-full rounded-2xl bg-app-panel p-5 text-base text-app-ink shadow-sm outline-none ring-1 ring-transparent placeholder:text-app-muted/60 focus:ring-amber-400" />
      <div className="space-y-3">
        <p className={`${eyebrowClass} flex items-center gap-1.5`}><span className="text-amber-500" aria-hidden>✦</span>Stuck? Tap an example to use it</p>
        <div className="flex flex-col items-start gap-2.5">
          {q.examples.map((e) => (
            <button key={e} type="button" onClick={() => onChange(e)} className="rounded-xl bg-app-panel px-4 py-3 text-left text-sm text-app-ink shadow-sm transition hover:ring-1 hover:ring-amber-400">{e}</button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between pt-2">
        <BackButton label="Back" onClick={onBack} />
        <button type="button" onClick={onNext} disabled={q.required && !value.trim()} className={primaryBtn}>Continue</button>
      </div>
    </StepFrame>
  );
}

/** Format > structure > audience > message > credibility > goal. Calls onSubmit with a complete input.
 *  `initial` (the answers of an earlier pass) reopens the wizard on the goal step, filled in. */
export function Wizard({ error, initial, onSubmit }: Props) {
  const [input, setInput] = useState<WizardInput>(initial ?? EMPTY_INPUT);
  const [step, setStep] = useState(initial ? 2 + QUESTIONS.length : 0);
  const set = <K extends keyof WizardInput>(key: K, value: WizardInput[K]) => setInput((prev) => ({ ...prev, [key]: value }));
  const submit = () => {
    if (input.format && input.structure && input.goal) onSubmit({ format: input.format, structure: input.structure, goal: input.goal, audience: input.audience, message: input.message, credibility: input.credibility });
  };

  const formatLabel = input.format ? SCRIPT_FORMATS[input.format].label : '';
  const goBack = () => setStep(step - 1);

  if (step === 0) {
    return (
      <StepFrame eyebrow="Step 01 · Pick your format" title="What kind of video is it?">
        <div className="grid gap-4 sm:grid-cols-2">
          {(Object.keys(SCRIPT_FORMATS) as ScriptFormat[]).map((k) => (
            <Choice key={k} title={SCRIPT_FORMATS[k].label} tag={SCRIPT_FORMATS[k].range} desc={SCRIPT_FORMATS[k].desc} onClick={() => { set('format', k); setStep(1); }} />
          ))}
        </div>
      </StepFrame>
    );
  }
  if (step === 1) {
    return (
      <StepFrame eyebrow={`Step 02 · ${formatLabel} · Pick a structure`} title="How should this script be built?" help="Different ideas land best in different shapes. Pick the one that fits, or let the AI decide if you are not sure.">
        <div className="space-y-4">
          <Choice title="Let AI choose" tag="Pick the best structure for my idea" desc="Best when you are unsure or want the AI to read your input and decide." onClick={() => { set('structure', 'ai_choose'); setStep(2); }} />
          {(Object.keys(SCRIPT_STRUCTURES) as ScriptStructure[]).map((k) => (
            <Choice key={k} title={SCRIPT_STRUCTURES[k].label} tag={SCRIPT_STRUCTURES[k].tagline} desc={SCRIPT_STRUCTURES[k].desc} onClick={() => { set('structure', k); setStep(2); }} />
          ))}
        </div>
        <BackButton label="Back to format" onClick={goBack} />
      </StepFrame>
    );
  }
  const qIndex = step - 2;
  if (qIndex < QUESTIONS.length) {
    const q = QUESTIONS[qIndex];
    return <QuestionStep key={q.key} q={q} index={qIndex} formatLabel={formatLabel} value={input[q.key]} onChange={(v) => set(q.key, v)} onBack={goBack} onNext={() => setStep(step + 1)} />;
  }
  const total = QUESTIONS.length + 1;
  return (
    <StepFrame eyebrow={`Step 03 · ${formatLabel} · 0${total} of 0${total}`} title="What is the goal of this video?" progress={<ProgressBar total={total} current={total - 1} />}>
      <div className="space-y-4">
        {(Object.keys(SCRIPT_GOALS) as ScriptGoal[]).map((k) => (
          <Choice key={k} title={SCRIPT_GOALS[k].label} selected={input.goal === k} onClick={() => set('goal', k)} />
        ))}
      </div>
      {error && <p role="alert" className="text-sm text-app-danger">{error}</p>}
      <div className="flex items-center justify-between pt-2">
        <BackButton label="Back" onClick={goBack} />
        <button type="button" onClick={submit} disabled={!input.goal} className={primaryBtn}>See hook options</button>
      </div>
    </StepFrame>
  );
}
