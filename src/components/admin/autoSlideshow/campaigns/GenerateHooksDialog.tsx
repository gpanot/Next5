'use client';

import { useEffect, useState } from 'react';
import { MAX_GENERATED_HOOKS, MIN_GENERATED_HOOKS } from '../../../../types/admin/hookKnowledge';
import type { AutoPhotoSource, CampaignCard, CampaignCtaText } from '../../../../types/admin/slideshowCampaign';
import { adminFetch } from '../../business/useAdminApi';
import type { HooksWritten } from './useGenerateAll';

type Props = {
  token: string;
  campaignId: string;
  /** The editor's slides, so the hooks match the content written so far. */
  cards: CampaignCard[];
  /** Hooks there now: generating replaces them. */
  current: number;
  onClose: () => void;
  /** "I do it manually": the hooks, and the hook photos' stock search written with them. */
  onDone: (hooks: string[], photoQuery: string) => void;
  /** "Generate the entire slideshows": the hooks, then every slide written from them. Resolves false on failure. */
  onDoneAll: (written: HooksWritten) => Promise<boolean>;
};

/** What is being written: the hooks, or the entire slideshows from them. */
type Writing = 'hooks' | 'all' | null;

const COUNTS = Array.from({ length: MAX_GENERATED_HOOKS - MIN_GENERATED_HOOKS + 1 }, (_, i) => MIN_GENERATED_HOOKS + i);
const RECOMMENDED_COUNT = 5;
const DEFAULT_COUNT = RECOMMENDED_COUNT;

const countClass = (on: boolean) =>
  `relative flex h-12 min-w-12 flex-1 items-center justify-center rounded-xl text-base font-bold transition active:scale-95 ${on ? 'bg-emerald-400 text-zinc-950' : 'border border-white/15 text-white/80 hover:bg-white/5'}`;
const primaryClass = 'flex min-h-12 items-center justify-center gap-2 rounded-full bg-emerald-400 px-4 text-sm font-semibold text-zinc-950 shadow-sm transition active:scale-95 disabled:opacity-60';
const secondaryClass = 'flex min-h-12 items-center justify-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-400/20 active:scale-95 disabled:opacity-60';

const Spinner = ({ dark }: { dark: boolean }) => <span aria-hidden className={`h-4 w-4 animate-spin rounded-full border-2 ${dark ? 'border-zinc-950/30 border-t-zinc-950' : 'border-white/30 border-t-white'}`} />;

/** Step 1: how many hooks, 2-6, one post each. */
function CountStep({ count, setCount, current, busy, onGenerate }: { count: number; setCount: (n: number) => void; current: number; busy: boolean; onGenerate: () => void }) {
  return (
    <>
      <div role="radiogroup" aria-label="Number of hooks" className="flex gap-2 pt-1.5">
        {COUNTS.map((n) => (
          <button key={n} type="button" role="radio" aria-checked={count === n} disabled={busy} onClick={() => setCount(n)} className={countClass(count === n)}>
            {n}
            {n === RECOMMENDED_COUNT && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-300 px-1.5 py-0.5 text-[9px] leading-none font-bold whitespace-nowrap text-zinc-950 shadow-sm">Recommended</span>}
          </button>
        ))}
      </div>
      {current > 0 && <p className="text-sm text-amber-300">This replaces your {current} {current === 1 ? 'hook' : 'hooks'}.</p>}
      <button type="button" onClick={onGenerate} disabled={busy} className={`w-full ${primaryClass}`}>
        {busy && <Spinner dark />}
        {busy ? 'Writing your hooks…' : `Generate ${count} hooks`}
      </button>
    </>
  );
}

type ReviewProps = { hooks: string[]; writing: Writing; hasContent: boolean; onRegenerate: () => void; onAll: () => void; onManual: () => void };

/** Step 2: the hooks written, then the entire slideshows from them or the slides by hand. */
function ReviewStep({ hooks, writing, hasContent, onRegenerate, onAll, onManual }: ReviewProps) {
  const busy = writing !== null;
  return (
    <>
      <ol aria-busy={writing === 'hooks'} className={`max-h-[45vh] space-y-2 overflow-y-auto transition-opacity ${writing === 'hooks' ? 'opacity-40' : ''}`}>
        {hooks.map((hook, i) => (
          <li key={`${i}-${hook}`} className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm leading-snug">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-xs font-bold text-emerald-300">{i + 1}</span>
            <span className="pt-0.5">{hook}</span>
          </li>
        ))}
      </ol>
      <button type="button" onClick={onRegenerate} disabled={busy} className="mx-auto flex min-h-11 items-center gap-2 px-3 text-sm font-semibold text-emerald-300 underline-offset-4 transition hover:underline disabled:opacity-50">
        {writing === 'hooks' ? <Spinner dark={false} /> : <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></svg>}
        {writing === 'hooks' ? 'Regenerating…' : 'Regenerate'}
      </button>
      <p className="text-sm text-white/60">The entire slideshows also writes the content slides and the CTA, and picks their photos.{hasContent && ' It replaces your content slides.'}</p>
      <div className="flex flex-col gap-2">
        <button type="button" onClick={onAll} disabled={busy} className={primaryClass}>
          {writing === 'all' && <Spinner dark />}
          {writing === 'all' ? 'Writing your slideshows…' : 'Generate the entire slideshows'}
        </button>
        <button type="button" onClick={onManual} disabled={busy} className={secondaryClass}>
          I do it manually
        </button>
      </div>
    </>
  );
}

/** Two steps: "How many hooks?" writes them from the brand, the slides and the Hook Knowledge; then the hooks show,
 *  to regenerate, keep for slides written by hand, or turn into the entire slideshows (content slides, CTA, photos). */
export function GenerateHooksDialog({ token, campaignId, cards, current, onClose, onDone, onDoneAll }: Props) {
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [written, setWritten] = useState<HooksWritten | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [writing, setWriting] = useState<Writing>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = writing !== null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || busy) return;
      e.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose, busy]);

  /** `tried`: the hooks shown on "Regenerate", so the new ones differ. */
  const writeHooks = async (tried?: string[]) => {
    setWriting('hooks');
    setError(null);
    try {
      const { hooks, photoQuery, photoSource, cta } = await adminFetch<{ hooks: string[]; photoQuery?: string; photoSource?: AutoPhotoSource; cta?: CampaignCtaText }>(token, `/api/slideshow/campaigns/${campaignId}/hooks`, { method: 'POST', body: JSON.stringify({ count, cards, tried }) });
      setWritten({ hooks, photoQuery: photoQuery ?? '', photoSource: photoSource ?? 'stock', cta: cta ?? { title: 'Follow for more', body: '' } });
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not write the hooks. Try again.');
    }
    setWriting(null);
  };
  // The editor shows the error when the slides could not be written; the hooks are in either way.
  const writeAll = async (w: HooksWritten) => {
    setWriting('all');
    setError(null);
    await onDoneAll(w);
  };
  const hasContent = cards.some((c) => c.role === 'item' && c.title.trim());
  const review = step === 2 && written;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 sm:items-center" onClick={() => !busy && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="generate-hooks-title" onClick={(e) => e.stopPropagation()} className="w-full max-w-md space-y-5 rounded-t-2xl border border-white/10 bg-zinc-900 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-white shadow-xl sm:rounded-2xl">
        <div className={`relative space-y-1 pr-10 ${review ? 'pl-10' : ''}`}>
          {review && (
            <button type="button" onClick={() => { setError(null); setStep(1); }} disabled={busy} aria-label="Back to the number of hooks" className="absolute -top-1 -left-1 flex h-11 w-11 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white active:scale-95 disabled:opacity-40">
              <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </button>
          )}
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="absolute -top-1 -right-1 flex h-11 w-11 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white active:scale-95 disabled:opacity-40">
            <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
          <p className="text-xs font-semibold tracking-wide text-white/40 uppercase">Step {review ? 2 : 1} of 2</p>
          <h2 id="generate-hooks-title" className="text-lg font-bold">{review ? `Your ${written.hooks.length} hooks` : 'How many hooks do you want to generate?'}</h2>
          <p className="text-sm text-white/60">
            {review ? 'One per post. Like them? Write the entire slideshows, or do the slides yourself.' : `${count} hooks, rotating one per post. Which means ${count} posts will be generated for your campaign.`}
          </p>
        </div>
        {review ? (
          <ReviewStep hooks={written.hooks} writing={writing} hasContent={hasContent} onRegenerate={() => void writeHooks(written.hooks)} onAll={() => void writeAll(written)} onManual={() => onDone(written.hooks, written.photoQuery)} />
        ) : (
          <CountStep count={count} setCount={setCount} current={current} busy={busy} onGenerate={() => void writeHooks()} />
        )}
        {error && <p role="alert" className="rounded-lg bg-red-500/15 p-3 text-sm text-red-300">{error}</p>}
      </div>
    </div>
  );
}
