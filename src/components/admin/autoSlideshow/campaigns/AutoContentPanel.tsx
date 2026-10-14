'use client';

import type { ReactNode } from 'react';
import { autoCreditCost, AUTO_MAX_SLIDES, AUTO_MIN_SLIDES, autoSlideCount, MAX_AUTO_PROMPT_CHARS, type CampaignDraft } from '../../../../types/admin/slideshowCampaign';
import type { AutoSettings } from './useAutoContent';

type Props = {
  draft: CampaignDraft;
  settings: AutoSettings;
  writing: boolean;
  /** Photos still coming in from the last run. */
  photosPending: number;
  onChange: (patch: Partial<AutoSettings>) => void;
  onRun: () => void;
};

type Option<T> = { value: T; label: string };

const label = 'text-sm font-medium text-white/55';
const chipClass = (on: boolean) =>
  `min-h-11 rounded-full border px-4 text-sm font-semibold transition active:scale-95 ${on ? 'border-emerald-400 bg-emerald-400/10 text-white' : 'border-white/10 text-white/50 hover:border-white/25 hover:text-white/80'}`;

function Chips<T extends string | boolean>({ title, options, value, onPick }: { title: string; options: Option<T>[]; value: T; onPick: (v: T) => void }) {
  return (
    <div className="space-y-2">
      <p className={label}>{title}</p>
      <div role="radiogroup" aria-label={title} className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={String(o.value)} type="button" role="radio" aria-checked={value === o.value} onClick={() => onPick(o.value)} className={chipClass(value === o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** How many slides Auto writes (the hook's number, or the AI's pick) and its price: 1 credit per post, one post per hook. */
const countNote = (fixed: number | null, posts: number): string => {
  const slides = fixed !== null ? `${fixed} slides, then your CTA as number ${fixed + 1}, as your hook says.` : `The AI picks ${AUTO_MIN_SLIDES}-${AUTO_MAX_SLIDES} slides.`;
  return `${slides} 1 post = 1 credit: ${posts} ${posts === 1 ? 'hook' : 'hooks'}, ${posts} ${posts === 1 ? 'post' : 'posts'}.`;
};

/** What the slides are written from (the hook, so the person knows the prompt adds to it), with the button beside it. */
function HookContext({ hooks, fixed, children }: { hooks: string[]; fixed: number | null; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1 text-sm text-white/45">
        {hooks.length === 0 ? (
          <p className="text-amber-300">No hook yet. Add one in the Hook tab so the slides follow it.</p>
        ) : (
          <p className="truncate">Follows your hook: <span className="text-white/75">{hooks[0]}</span>{hooks.length > 1 && ` (+${hooks.length - 1} more)`}</p>
        )}
        <p>{countNote(fixed, autoCreditCost(hooks))}</p>
      </div>
      {children}
    </div>
  );
}

/** The Content tab's "Auto": write every content slide (and find its photo) from one prompt. */
export function AutoContentPanel({ draft, settings, writing, photosPending, onChange, onRun }: Props) {
  const busy = writing || photosPending > 0;
  const fixed = autoSlideCount(draft.hooks);
  const cost = autoCreditCost(draft.hooks);
  const credits = `${cost} ${cost === 1 ? 'credit' : 'credits'}`;
  const action = writing ? 'Writing slides…' : photosPending > 0 ? `Adding photos… ${photosPending} left` : fixed !== null ? `Write ${fixed} slides · ${credits}` : `Write slides · ${credits}`;
  return (
    <div className="space-y-5">
      <label className="block space-y-2">
        <span className={label}>What the slides are about</span>
        <textarea
          value={settings.prompt}
          maxLength={MAX_AUTO_PROMPT_CHARS}
          rows={4}
          onChange={(e) => onChange({ prompt: e.target.value })}
          placeholder="Example: easy ways to improve your golf swing. Not the usual tips. Use real numbers when you can."
          className="w-full resize-none rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-base text-white placeholder:text-white/35 focus:border-emerald-400 focus:outline-none"
        />
      </label>
      <HookContext hooks={draft.hooks} fixed={fixed}>
        <button type="button" onClick={onRun} disabled={busy} className="flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-emerald-400 px-6 text-base font-semibold text-zinc-950 transition hover:bg-emerald-300 active:scale-[0.98] disabled:opacity-60 sm:w-auto">
          {busy && <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950/30 border-t-zinc-950" />}
          {action}
        </button>
      </HookContext>

      <div className="flex flex-wrap gap-x-8 gap-y-5 border-t border-white/10 pt-5">
        <Chips title="Format" value={settings.format} onPick={(format) => onChange({ format })} options={[{ value: 'numbered', label: 'Numbered' }, { value: 'steps', label: 'Steps' }, { value: 'plain', label: 'Plain' }]} />
        <Chips title="Length" value={settings.length} onPick={(length) => onChange({ length })} options={[{ value: 'short', label: '5-7 words' }, { value: 'medium', label: '10-12 words' }, { value: 'long', label: '15-20 words' }]} />
        <Chips title="Tone" value={settings.tone} onPick={(tone) => onChange({ tone })} options={[{ value: 'plain', label: 'Plain' }, { value: 'punchy', label: 'Punchy' }, { value: 'expert', label: 'Expert' }, { value: 'warm', label: 'Warm' }]} />
        <Chips title="Research" value={settings.research} onPick={(research) => onChange({ research })} options={[{ value: false, label: 'Off' }, { value: true, label: 'Search the web' }]} />
      </div>
      <div className="flex flex-wrap gap-x-8 gap-y-5 border-t border-white/10 pt-5">
        <Chips title="Images" value={settings.samePhoto} onPick={(samePhoto) => onChange({ samePhoto })} options={[{ value: false, label: 'Different photo every slide' }, { value: true, label: 'Same photo every slide' }]} />
        <Chips title="Photos" value={settings.photoSource} onPick={(photoSource) => onChange({ photoSource })} options={[{ value: 'ai', label: 'AI photos' }, { value: 'stock', label: 'Your library + stock' }]} />
      </div>

      <p className="border-t border-white/10 pt-5 text-sm text-white/45">Replaces your content slides; the CTA stays. Edit any slide after in Slide by slide.</p>
    </div>
  );
}
