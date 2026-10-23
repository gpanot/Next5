'use client';

import { Star, Timer, X } from 'lucide-react';
import { editTopic, MAIN_TOPICS, pillarTopics, TOPIC_MAX, toggleMain, type TopicItem, type Topics } from '../../../lib/blueprint/schema';
import { PILLARS, type Pillar } from '../../../lib/scriptGenerator/types';
import { AppButton } from '../../ui/AppButton';
import { TextInput } from '../../ui/TextInput';
import { PILLAR_COPY, TOPICS_STEP } from './copy';
import { useSprintTimer } from './useSprintTimer';

const SPRINT_SECONDS = 60;

const SprintTimer = () => {
  const { left, running, finished, start, reset } = useSprintTimer(SPRINT_SECONDS);
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-app-line bg-app-panel p-4 shadow-sm">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-app-sunken text-[20px] font-semibold tabular-nums text-app-ink" aria-live="polite" aria-label={`${left} seconds left`}>
        {left}
      </span>
      <p className="min-w-0 flex-1 basis-48 text-[14px] text-app-muted">{finished ? TOPICS_STEP.done : TOPICS_STEP.timerHint}</p>
      <AppButton size="lg" variant={running ? 'secondary' : 'primary'} onClick={running ? reset : start} iconLeft={<Timer className="h-4 w-4" />}>
        {running ? TOPICS_STEP.reset : TOPICS_STEP.start}
      </AppButton>
    </div>
  );
};

type SlotProps = { pillar: Pillar; index: number; item: TopicItem; mainFull: boolean; onText: (text: string) => void; onToggle: () => void };

/** One topic field with a Main / Extra toggle and a clear button. */
const TopicSlot = ({ pillar, index, item, mainFull, onText, onToggle }: SlotProps) => {
  const filled = Boolean(item.text.trim());
  const blocked = filled && !item.main && mainFull;
  const example = PILLAR_COPY[pillar].examples[index];
  return (
    <li className="flex items-center gap-2">
      <TextInput
        aria-label={`${PILLAR_COPY[pillar].name}, ${TOPICS_STEP.slot(index + 1)}`}
        value={item.text}
        maxLength={TOPIC_MAX}
        placeholder={example ?? TOPICS_STEP.slot(index + 1)}
        onChange={(e) => onText(e.target.value)}
        className="min-h-11 flex-1 text-[16px] sm:text-[14px]"
      />
      <button
        type="button"
        onClick={onToggle}
        disabled={!filled || blocked}
        aria-pressed={item.main}
        title={blocked ? TOPICS_STEP.mainFull : undefined}
        className={[
          'flex min-h-11 min-w-[76px] items-center justify-center gap-1 rounded-xl border px-2 text-[12px] font-medium transition-colors duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent disabled:cursor-not-allowed disabled:opacity-40',
          item.main ? 'border-app-accent bg-app-accent-soft text-app-accent' : 'border-app-line text-app-muted hover:text-app-ink',
        ].join(' ')}
      >
        <Star aria-hidden className={['h-3.5 w-3.5', item.main ? 'fill-current' : ''].join(' ')} />
        {item.main ? TOPICS_STEP.main : TOPICS_STEP.extra}
      </button>
      {filled && (
        <button type="button" onClick={() => onText('')} aria-label={`${TOPICS_STEP.clear} ${TOPICS_STEP.slot(index + 1)}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-app-muted transition-colors duration-200 hover:bg-app-sunken hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent">
          <X aria-hidden className="h-4 w-4" />
        </button>
      )}
    </li>
  );
};

type PillarFieldProps = { pillar: Pillar; items: TopicItem[]; onChange: (items: TopicItem[]) => void };

const PillarField = ({ pillar, items, onChange }: PillarFieldProps) => {
  const copy = PILLAR_COPY[pillar];
  const { main, optional } = pillarTopics(items);
  const mainFull = main.length >= MAIN_TOPICS;
  return (
    <section className="flex min-w-0 flex-col gap-2 rounded-2xl border border-app-line bg-app-panel p-4 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[16px] font-semibold text-app-ink">{copy.name}</h3>
        <span className="text-[12px] tabular-nums text-app-muted">{TOPICS_STEP.count(main.length, main.length + optional.length)}</span>
      </div>
      <p className="text-[13px] text-app-muted">{copy.body}</p>
      <ul className="flex flex-col gap-1 text-[13px] font-medium text-app-ink">
        {copy.questions.map((q) => <li key={q}>{q}</li>)}
      </ul>
      <ol className="flex flex-col gap-2 pt-1">
        {items.map((item, i) => (
          <TopicSlot
            key={i}
            pillar={pillar}
            index={i}
            item={item}
            mainFull={mainFull}
            onText={(text) => onChange(editTopic(items, i, text))}
            onToggle={() => onChange(toggleMain(items, i))}
          />
        ))}
      </ol>
    </section>
  );
};

type TopicBankProps = { topics: Topics; onChange: (topics: Topics) => void };

/** Up to 5 topics per branch, 3 of them main, with an optional 60 second sprint timer. */
export const TopicBank = ({ topics, onChange }: TopicBankProps) => (
  <div className="flex flex-col gap-4">
    <SprintTimer />
    <div className="grid gap-4 lg:grid-cols-3">
      {PILLARS.map((pillar) => (
        <PillarField key={pillar} pillar={pillar} items={topics[pillar]} onChange={(items) => onChange({ ...topics, [pillar]: items })} />
      ))}
    </div>
    <p className="text-[13px] text-app-muted">{TOPICS_STEP.placeholderNote}</p>
  </div>
);
