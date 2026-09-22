'use client';

import { Check } from 'lucide-react';
import type { SetTemplateDto } from '../../../../types/business/catalog';
import { Field } from '../../../ui/Field';
import { StylePager } from './StylePager';
import { totalPhotos, type GenerationMode, type GenerationSettings } from './wizardSettings';

export type { GenerationMode, GenerationSettings } from './wizardSettings';

type Props = {
  templates: readonly SetTemplateDto[];
  value: GenerationSettings;
  onChange: (v: GenerationSettings) => void;
};

const ModeCard = ({ title, body, active, onClick }: { title: string; body: string; active: boolean; onClick: () => void }) => (
  <button
    type="button"
    role="radio"
    aria-checked={active}
    onClick={onClick}
    className={`flex flex-col gap-1 rounded-xl border p-3.5 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent ${active ? 'border-app-accent bg-app-accent-soft' : 'border-app-line bg-app-panel hover:border-app-muted'}`}
  >
    <span className="flex items-center justify-between text-[14px] font-semibold text-app-ink">
      {title}
      {active && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-app-accent text-white"><Check aria-hidden className="h-3 w-3" /></span>}
    </span>
    <span className="text-[12px] leading-snug text-app-muted">{body}</span>
  </button>
);

/** Step 2: which styles to make. One photo per style. */
export const GenerationSettingsStep = ({ templates, value, onChange }: Props) => {
  const total = totalPhotos(value, templates);
  const modes: readonly { mode: GenerationMode; title: string; body: string }[] = [
    { mode: 'custom', title: 'Pick styles', body: 'Choose the styles you want. 1 photo each.' },
    { mode: 'automatic', title: 'All styles', body: `All ${templates.length} styles. ${templates.length} photos.` },
  ];
  const toggle = (id: string) =>
    onChange({ ...value, templateIds: value.templateIds.includes(id) ? value.templateIds.filter((x) => x !== id) : [...value.templateIds, id] });

  return (
    <div className="flex flex-col gap-5">
      <div role="radiogroup" aria-label="How many variations" className="grid grid-cols-2 gap-2">
        {modes.map((m) => <ModeCard key={m.mode} title={m.title} body={m.body} active={value.mode === m.mode} onClick={() => onChange({ ...value, mode: m.mode })} />)}
      </div>

      {value.mode === 'custom' && (
        <Field label="Styles" helper="Swipe to see more. Tap to pick.">
          <StylePager templates={templates} selected={value.templateIds} onToggle={toggle} />
        </Field>
      )}

      <div className="flex items-center justify-between rounded-xl bg-app-sunken px-4 py-3 text-[13px]">
        <span className="text-app-muted">You get</span>
        <span className="font-semibold text-app-ink">{total} photo{total === 1 ? '' : 's'} · {total} credit{total === 1 ? '' : 's'}</span>
      </div>
    </div>
  );
};
