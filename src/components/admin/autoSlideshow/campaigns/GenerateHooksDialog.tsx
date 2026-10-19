'use client';

import { useEffect, useState } from 'react';
import { MAX_GENERATED_HOOKS, MIN_GENERATED_HOOKS } from '../../../../types/admin/hookKnowledge';
import type { AutoPhotoSource, CampaignCard } from '../../../../types/admin/slideshowCampaign';
import { adminFetch } from '../../business/useAdminApi';

type Props = {
  token: string;
  campaignId: string;
  /** The editor's slides, so the hooks match the content written so far. */
  cards: CampaignCard[];
  /** Hooks there now: generating replaces them. */
  current: number;
  onClose: () => void;
  /** The hooks, and the hook photos' stock search written with them. */
  onDone: (hooks: string[], photoQuery: string) => void;
  /** "Generate the entire slideshows": the hooks, then every slide written from them. Resolves false on failure. */
  onDoneAll: (hooks: string[], photoQuery: string, photoSource: AutoPhotoSource) => Promise<boolean>;
};

/** What is being written: the hooks only, or the entire slideshows. */
type Writing = 'hooks' | 'all' | null;

const COUNTS = Array.from({ length: MAX_GENERATED_HOOKS - MIN_GENERATED_HOOKS + 1 }, (_, i) => MIN_GENERATED_HOOKS + i);
const RECOMMENDED_COUNT = 5;
const DEFAULT_COUNT = RECOMMENDED_COUNT;

const countClass = (on: boolean) =>
  `relative flex h-12 min-w-12 flex-1 items-center justify-center rounded-xl text-base font-bold transition active:scale-95 ${on ? 'bg-emerald-400 text-zinc-950' : 'border border-white/15 text-white/80 hover:bg-white/5'}`;

/** "How many hooks?": 2-6, one post each. Writes them from the brand, the slides and the Hook Knowledge; "the entire
 *  slideshows" also writes the content slides and picks the photos. */
export function GenerateHooksDialog({ token, campaignId, cards, current, onClose, onDone, onDoneAll }: Props) {
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [writing, setWriting] = useState<Writing>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || writing !== null) return;
      e.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose, writing]);

  const generate = async (what: 'hooks' | 'all') => {
    setWriting(what);
    setError(null);
    try {
      const { hooks, photoQuery, photoSource } = await adminFetch<{ hooks: string[]; photoQuery?: string; photoSource?: AutoPhotoSource }>(token, `/api/slideshow/campaigns/${campaignId}/hooks`, { method: 'POST', body: JSON.stringify({ count, cards }) });
      if (what === 'hooks') return onDone(hooks, photoQuery ?? '');
      // The editor shows the error when the slides could not be written; the hooks are in either way.
      await onDoneAll(hooks, photoQuery ?? '', photoSource ?? 'stock');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not write the hooks. Try again.');
      setWriting(null);
    }
  };
  const busy = writing !== null;
  const hasContent = cards.some((c) => c.role === 'item' && c.title.trim());
  const spinner = (dark: boolean) => <span aria-hidden className={`h-4 w-4 animate-spin rounded-full border-2 ${dark ? 'border-zinc-950/30 border-t-zinc-950' : 'border-white/30 border-t-white'}`} />;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 sm:items-center" onClick={() => !busy && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="generate-hooks-title" onClick={(e) => e.stopPropagation()} className="w-full max-w-md space-y-5 rounded-t-2xl border border-white/10 bg-zinc-900 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-white shadow-xl sm:rounded-2xl">
        <div className="relative space-y-1 pr-10">
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="absolute -top-1 -right-1 flex h-11 w-11 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white active:scale-95 disabled:opacity-40">
            <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
          <h2 id="generate-hooks-title" className="text-lg font-bold">How many hooks do you want to generate?</h2>
          <p className="text-sm text-white/60">
            {count} hooks, rotating one per post. Which means {count} posts will be generated for your campaign.
          </p>
        </div>
        <div role="radiogroup" aria-label="Number of hooks" className="flex gap-2 pt-1.5">
          {COUNTS.map((n) => (
            <button key={n} type="button" role="radio" aria-checked={count === n} disabled={busy} onClick={() => setCount(n)} className={countClass(count === n)}>
              {n}
              {n === RECOMMENDED_COUNT && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-300 px-1.5 py-0.5 text-[9px] leading-none font-bold whitespace-nowrap text-zinc-950 shadow-sm">Recommended</span>}
            </button>
          ))}
        </div>
        {current > 0 && <p className="text-sm text-amber-300">This replaces your {current} {current === 1 ? 'hook' : 'hooks'}.</p>}
        <p className="text-sm text-white/60">The entire slideshows also writes the content slides and picks their photos.{hasContent && ' It replaces your content slides.'}</p>
        {error && <p role="alert" className="rounded-lg bg-red-500/15 p-3 text-sm text-red-300">{error}</p>}
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => void generate('all')} disabled={busy} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-emerald-400 px-4 text-sm font-semibold text-zinc-950 shadow-sm transition active:scale-95 disabled:opacity-60">
            {writing === 'all' && spinner(true)}
            {writing === 'all' ? 'Writing your slideshows…' : 'Generate the entire slideshows'}
          </button>
          <button type="button" onClick={() => void generate('hooks')} disabled={busy} className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-400/20 active:scale-95 disabled:opacity-60">
            {writing === 'hooks' && spinner(false)}
            {writing === 'hooks' ? 'Writing your hooks…' : `Generate ${count} hooks only`}
          </button>
        </div>
      </div>
    </div>
  );
}
