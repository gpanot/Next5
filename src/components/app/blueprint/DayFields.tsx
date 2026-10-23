'use client';

import { useState } from 'react';
import { HOOK_IDEA_MAX, NOTES_MAX, pillarTopics, type DayPatch, type PlanDay, type Topics } from '../../../lib/blueprint/schema';
import { BLUEPRINT_FORMATS, PILLARS } from '../../../lib/scriptGenerator/types';
import { AppButton } from '../../ui/AppButton';
import { Select } from '../../ui/Select';
import { Textarea } from '../../ui/Textarea';
import { TextInput } from '../../ui/TextInput';
import { FORMAT_COPY, PILLAR_COPY } from './copy';
import { DAY_CARD } from './planCopy';

const selectClass = 'min-h-11 text-[16px] sm:text-[14px]';

const Labeled = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="flex min-w-0 flex-col gap-1.5">
    <span className="text-[12px] font-semibold uppercase tracking-wider text-app-muted">{label}</span>
    {children}
  </label>
);

const TopicSelect = ({ day, topics, onPick }: { day: PlanDay; topics: Topics; onPick: (topic: string) => void }) => {
  const { main, optional } = pillarTopics(topics[day.pillar]);
  const removed = Boolean(day.topic) && !main.includes(day.topic) && !optional.includes(day.topic);
  return (
    <Labeled label={DAY_CARD.topic}>
      <Select value={day.topic} onChange={(e) => onPick(e.target.value)} className={selectClass} error={removed}>
        <option value="">{main.length + optional.length ? DAY_CARD.pickTopic : DAY_CARD.noTopics}</option>
        {main.length > 0 && <optgroup label={DAY_CARD.mainGroup}>{main.map((t) => <option key={t} value={t}>{t}</option>)}</optgroup>}
        {optional.length > 0 && <optgroup label={DAY_CARD.extraGroup}>{optional.map((t) => <option key={t} value={t}>{t}</option>)}</optgroup>}
        {removed && <option value={day.topic}>{day.topic}</option>}
      </Select>
      {removed && <span role="alert" className="text-[12px] text-app-danger">{DAY_CARD.removed(day.topic)}</span>}
    </Labeled>
  );
};

/** Asks before a topic, branch or format change throws away a script. */
const ConfirmReplace = ({ onYes, onNo }: { onYes: () => void; onNo: () => void }) => (
  <div role="alertdialog" aria-label={DAY_CARD.replaceWarn} className="flex flex-wrap items-center gap-2 rounded-xl border border-app-warning/40 bg-app-warning/10 p-3 text-[14px] text-app-ink">
    <span className="flex-1 basis-56">{DAY_CARD.replaceWarn}</span>
    <AppButton size="lg" variant="danger" onClick={onYes}>{DAY_CARD.replaceYes}</AppButton>
    <AppButton size="lg" variant="secondary" onClick={onNo}>{DAY_CARD.replaceNo}</AppButton>
  </div>
);

type Props = { day: PlanDay; topics: Topics; onChange: (patch: DayPatch) => void; locked: boolean };

/** Branch, topic, format, hook idea and private details for one day. */
export const DayFields = ({ day, topics, onChange, locked }: Props) => {
  const [pending, setPending] = useState<DayPatch | null>(null);
  const guarded = (patch: DayPatch) => (day.script ? setPending(patch) : onChange(patch));
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_2fr_1fr]">
        <Labeled label={DAY_CARD.branch}>
          <Select value={day.pillar} disabled={locked} onChange={(e) => guarded({ pillar: e.target.value as PlanDay['pillar'], topic: '' })} className={selectClass}>
            {PILLARS.map((p) => <option key={p} value={p}>{PILLAR_COPY[p].short}</option>)}
          </Select>
        </Labeled>
        <TopicSelect day={day} topics={topics} onPick={(topic) => (locked ? undefined : guarded({ topic }))} />
        <Labeled label={DAY_CARD.format}>
          <Select value={day.format} disabled={locked} onChange={(e) => guarded({ format: e.target.value as PlanDay['format'] })} className={selectClass}>
            {BLUEPRINT_FORMATS.map((f) => <option key={f} value={f}>{FORMAT_COPY[f].name}</option>)}
          </Select>
        </Labeled>
      </div>
      {pending && <ConfirmReplace onYes={() => { onChange(pending); setPending(null); }} onNo={() => setPending(null)} />}
      <Labeled label={DAY_CARD.hookIdea}>
        <TextInput value={day.hookIdea} maxLength={HOOK_IDEA_MAX} placeholder={DAY_CARD.hookIdeaPlaceholder} onChange={(e) => onChange({ hookIdea: e.target.value })} className={selectClass} />
      </Labeled>
      <Labeled label={DAY_CARD.notes}>
        <Textarea value={day.notes} rows={2} maxLength={NOTES_MAX} placeholder={DAY_CARD.notesPlaceholder} onChange={(e) => onChange({ notes: e.target.value })} className="text-[16px] sm:text-[14px]" />
      </Labeled>
    </div>
  );
};
