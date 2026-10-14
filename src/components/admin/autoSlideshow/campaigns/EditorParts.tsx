'use client';

import { useState } from 'react';
import { campaignProblems, type CampaignDraft } from '../../../../types/admin/slideshowCampaign';

export function NameInput({ value, onSave }: { value: string; onSave: (name: string) => void }) {
  const [text, setText] = useState(value);
  const commit = () => text.trim() && text.trim() !== value && onSave(text.trim());
  return (
    <input
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      maxLength={80}
      aria-label="Campaign name"
      className="min-h-11 w-full min-w-0 rounded-xl border border-white/15 bg-white/5 px-3 text-base font-semibold text-white focus:border-emerald-400 focus:outline-none sm:max-w-xs"
    />
  );
}

/** What is left before the campaign can be scheduled. Hidden once the draft is ready. */
export function Checklist({ draft }: { draft: CampaignDraft }) {
  const problems = campaignProblems(draft);
  if (problems.length === 0) return null;
  return (
    <section aria-label="Before you schedule" className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
      <p className="mb-2 text-sm font-semibold text-amber-200">Before you schedule</p>
      <ul className="space-y-1 text-sm text-amber-100/80">
        {problems.slice(0, 5).map((p) => <li key={p}>· {p}</li>)}
        {problems.length > 5 && <li>· and {problems.length - 5} more</li>}
      </ul>
    </section>
  );
}

/** The Content tab's two ways to work: write every slide from one prompt, or edit each slide by hand. */
export type ContentMode = 'auto' | 'slides';

export function ContentModeTabs({ mode, onPick }: { mode: ContentMode; onPick: (m: ContentMode) => void }) {
  const tab = (m: ContentMode, text: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === m}
      onClick={() => onPick(m)}
      className={`min-h-11 flex-1 border-b-2 px-4 text-sm font-semibold transition sm:flex-none ${mode === m ? 'border-emerald-400 text-white' : 'border-transparent text-white/50 hover:text-white/80'}`}
    >
      {text}
    </button>
  );
  return (
    <div role="tablist" aria-label="Content mode" className="-mt-2 mb-5 flex border-b border-white/10">
      {tab('auto', 'Auto')}
      {tab('slides', 'Slide by slide')}
    </div>
  );
}
