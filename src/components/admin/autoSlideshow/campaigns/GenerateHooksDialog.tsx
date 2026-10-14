'use client';

import { useEffect, useState } from 'react';
import { MAX_GENERATED_HOOKS, MIN_GENERATED_HOOKS } from '../../../../types/admin/hookKnowledge';
import type { CampaignCard } from '../../../../types/admin/slideshowCampaign';
import { adminFetch } from '../../business/useAdminApi';

type Props = {
  token: string;
  campaignId: string;
  /** The editor's slides, so the hooks match the content written so far. */
  cards: CampaignCard[];
  /** Hooks there now: generating replaces them. */
  current: number;
  onClose: () => void;
  onDone: (hooks: string[]) => void;
};

const COUNTS = Array.from({ length: MAX_GENERATED_HOOKS - MIN_GENERATED_HOOKS + 1 }, (_, i) => MIN_GENERATED_HOOKS + i);
const DEFAULT_COUNT = 3;

const countClass = (on: boolean) =>
  `flex h-12 min-w-12 flex-1 items-center justify-center rounded-xl text-base font-bold transition active:scale-95 ${on ? 'bg-emerald-400 text-zinc-950' : 'border border-white/15 text-white/80 hover:bg-white/5'}`;

/** "How many hooks?": 2-6, one post each. Writes them from the brand, the slides and the Hook Knowledge. */
export function GenerateHooksDialog({ token, campaignId, cards, current, onClose, onDone }: Props) {
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || writing) return;
      e.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose, writing]);

  const generate = async () => {
    setWriting(true);
    setError(null);
    try {
      const { hooks } = await adminFetch<{ hooks: string[] }>(token, `/api/slideshow/campaigns/${campaignId}/hooks`, { method: 'POST', body: JSON.stringify({ count, cards }) });
      onDone(hooks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not write the hooks. Try again.');
      setWriting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 sm:items-center" onClick={() => !writing && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="generate-hooks-title" onClick={(e) => e.stopPropagation()} className="w-full max-w-md space-y-5 rounded-t-2xl border border-white/10 bg-zinc-900 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-white shadow-xl sm:rounded-2xl">
        <div className="space-y-1">
          <h2 id="generate-hooks-title" className="text-lg font-bold">How many hooks do you want to generate?</h2>
          <p className="text-sm text-white/60">
            {count} hooks, rotating one per post. Which means {count} posts will be generated for your campaign.
          </p>
        </div>
        <div role="radiogroup" aria-label="Number of hooks" className="flex gap-2">
          {COUNTS.map((n) => (
            <button key={n} type="button" role="radio" aria-checked={count === n} disabled={writing} onClick={() => setCount(n)} className={countClass(count === n)}>{n}</button>
          ))}
        </div>
        {current > 0 && <p className="text-sm text-amber-300">This replaces your {current} {current === 1 ? 'hook' : 'hooks'}.</p>}
        {error && <p role="alert" className="rounded-lg bg-red-500/15 p-3 text-sm text-red-300">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} disabled={writing} className="min-h-12 flex-1 rounded-full border border-white/15 text-sm font-semibold text-white/80 transition hover:bg-white/5 active:scale-95 disabled:opacity-40">Cancel</button>
          <button type="button" onClick={() => void generate()} disabled={writing} className="flex min-h-12 flex-[2] items-center justify-center gap-2 rounded-full bg-emerald-400 text-sm font-semibold text-zinc-950 shadow-sm transition active:scale-95 disabled:opacity-60">
            {writing && <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950/30 border-t-zinc-950" />}
            {writing ? 'Writing your hooks…' : `Generate ${count} hooks`}
          </button>
        </div>
      </div>
    </div>
  );
}
