'use client';

import { Check, Minus, Plus } from 'lucide-react';
import Image from 'next/image';
import { influencerSamples } from '../../../../content/business/influencer';
import { hasManifestImage } from '../../../../lib/manifest';
import type { SetTemplateDto, ThemeDto } from '../../../../types/business/catalog';
import { Field } from '../../../ui/Field';
import { Select } from '../../../ui/Select';
import {
  AUTO_PHOTOS, AUTO_STYLE_COUNT, MAX_PHOTOS_PER_STYLE, totalPhotos,
  type GenerationMode, type GenerationSettings,
} from './wizardSettings';

export type { GenerationMode, GenerationSettings } from './wizardSettings';

type Props = {
  themes: readonly ThemeDto[];
  templates: readonly SetTemplateDto[];
  value: GenerationSettings;
  onChange: (v: GenerationSettings) => void;
};

const MODES: readonly { mode: GenerationMode; title: string; body: string }[] = [
  { mode: 'custom', title: 'Pick styles', body: 'Choose styles and how many of each. Start small.' },
  { mode: 'automatic', title: 'Full set', body: `${AUTO_STYLE_COUNT} styles × ${AUTO_PHOTOS} = ${AUTO_STYLE_COUNT * AUTO_PHOTOS} variations.` },
];

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

type StyleGridProps = { templates: readonly SetTemplateDto[]; selected: string[]; onToggle: (id: string) => void };

const StyleGrid = ({ templates, selected, onToggle }: StyleGridProps) => (
  <div className="grid grid-cols-3 gap-2">
    {templates.map((t) => {
      const on = selected.includes(t.id);
      const cover = influencerSamples(t.product, t.id).find(hasManifestImage) ?? t.coverImage;
      return (
        <button key={t.id} type="button" aria-pressed={on} onClick={() => onToggle(t.id)} className="group flex flex-col gap-1.5 text-left focus-visible:outline-none">
          <span className={`relative block aspect-[4/5] overflow-hidden rounded-xl bg-app-sunken ring-2 ring-offset-2 ring-offset-app-panel transition-all duration-200 group-focus-visible:ring-app-accent ${on ? 'ring-app-accent' : 'ring-transparent group-hover:ring-app-line'}`}>
            {hasManifestImage(cover) && <Image src={cover} alt="" fill sizes="(min-width: 640px) 160px, 30vw" className="object-cover" />}
            {on && <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-app-accent text-white"><Check aria-hidden className="h-3 w-3" /></span>}
          </span>
          <span className="text-[12px] font-medium leading-tight text-app-ink">{t.name}</span>
        </button>
      );
    })}
  </div>
);

const Counter = ({ value, onChange }: { value: number; onChange: (n: number) => void }) => (
  <div className="flex items-center gap-3">
    <button type="button" aria-label="Fewer" disabled={value <= 1} onClick={() => onChange(value - 1)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-app-line text-app-ink transition-colors duration-200 hover:bg-app-sunken disabled:opacity-40"><Minus aria-hidden className="h-4 w-4" /></button>
    <span className="w-5 text-center text-[15px] font-semibold tabular-nums text-app-ink" aria-live="polite">{value}</span>
    <button type="button" aria-label="More" disabled={value >= MAX_PHOTOS_PER_STYLE} onClick={() => onChange(value + 1)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-app-line text-app-ink transition-colors duration-200 hover:bg-app-sunken disabled:opacity-40"><Plus aria-hidden className="h-4 w-4" /></button>
  </div>
);

/** Step 2: which variations to make — a theme, then styles and how many of each. */
export const GenerationSettingsStep = ({ themes, templates, value, onChange }: Props) => {
  const theme = themes.find((t) => t.id === value.themeId);
  const total = totalPhotos(value, templates);
  const toggle = (id: string) =>
    onChange({ ...value, templateIds: value.templateIds.includes(id) ? value.templateIds.filter((x) => x !== id) : [...value.templateIds, id] });

  return (
    <div className="flex flex-col gap-5">
      <Field label="Theme" htmlFor="inf-theme" helper={theme?.description}>
        <Select id="inf-theme" value={value.themeId} onChange={(e) => onChange({ ...value, themeId: e.target.value })}>
          {themes.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </Select>
      </Field>

      <div role="radiogroup" aria-label="How many variations" className="grid grid-cols-2 gap-2">
        {MODES.map((m) => <ModeCard key={m.mode} title={m.title} body={m.body} active={value.mode === m.mode} onClick={() => onChange({ ...value, mode: m.mode })} />)}
      </div>

      {value.mode === 'custom' && (
        <>
          <Field label="Styles">
            <StyleGrid templates={templates} selected={value.templateIds} onToggle={toggle} />
          </Field>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-medium text-app-ink">Variations per style</p>
              <p className="text-[12px] text-app-muted">Each one is a new photo of the same face.</p>
            </div>
            <Counter value={value.photosPerStyle} onChange={(n) => onChange({ ...value, photosPerStyle: Math.min(MAX_PHOTOS_PER_STYLE, Math.max(1, n)) })} />
          </div>
        </>
      )}

      <div className="flex items-center justify-between rounded-xl bg-app-sunken px-4 py-3 text-[13px]">
        <span className="text-app-muted">You get</span>
        <span className="font-semibold text-app-ink">{total} variation{total === 1 ? '' : 's'} · {total} credit{total === 1 ? '' : 's'}</span>
      </div>
    </div>
  );
};
